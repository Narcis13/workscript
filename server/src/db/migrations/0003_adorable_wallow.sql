ALTER TABLE `activities` MODIFY COLUMN `agency_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` MODIFY COLUMN `agent_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` MODIFY COLUMN `contact_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `activities` MODIFY COLUMN `property_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `activities` MODIFY COLUMN `request_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `agency_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_lead_scores` MODIFY COLUMN `contact_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `client_property_matches` MODIFY COLUMN `contact_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `client_property_matches` MODIFY COLUMN `property_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `client_property_matches` MODIFY COLUMN `request_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `client_requests` MODIFY COLUMN `contact_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `client_requests` MODIFY COLUMN `agency_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `client_requests` MODIFY COLUMN `assigned_agent_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `contacts` MODIFY COLUMN `agency_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` MODIFY COLUMN `assigned_agent_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `email_templates` MODIFY COLUMN `agency_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `agency_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `agent_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `owner_contact_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `property_valuations` MODIFY COLUMN `property_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` MODIFY COLUMN `agency_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` MODIFY COLUMN `contact_id` bigint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` MODIFY COLUMN `agent_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `whatsapp_messages` MODIFY COLUMN `conversation_id` bigint unsigned NOT NULL;