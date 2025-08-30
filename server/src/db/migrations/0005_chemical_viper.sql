ALTER TABLE `agencies` MODIFY COLUMN `created_at` timestamp;--> statement-breakpoint
ALTER TABLE `agencies` MODIFY COLUMN `updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `created_at` timestamp;--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `client_property_matches` MODIFY COLUMN `created_at` timestamp;--> statement-breakpoint
ALTER TABLE `client_property_matches` MODIFY COLUMN `updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `client_requests` MODIFY COLUMN `created_at` timestamp;--> statement-breakpoint
ALTER TABLE `client_requests` MODIFY COLUMN `updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `contacts` MODIFY COLUMN `created_at` timestamp;--> statement-breakpoint
ALTER TABLE `contacts` MODIFY COLUMN `updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `email_templates` MODIFY COLUMN `created_at` timestamp;--> statement-breakpoint
ALTER TABLE `email_templates` MODIFY COLUMN `updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `created_at` timestamp;--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` MODIFY COLUMN `created_at` timestamp;--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` MODIFY COLUMN `updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `properties` ADD `internal_code` varchar(24);--> statement-breakpoint
CREATE INDEX `properties_internal_code_idx` ON `properties` (`internal_code`);