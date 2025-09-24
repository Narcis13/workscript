ALTER TABLE `client_requests` ADD `status_color_code` varchar(64);--> statement-breakpoint
ALTER TABLE `client_requests` ADD `property_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `client_requests` ADD CONSTRAINT `client_requests_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `client_requests_property_idx` ON `client_requests` (`property_id`);

  CREATE TABLE ai_agents (
    id varchar(128) NOT NULL,
    agent_name varchar(255) NOT NULL,
    description text,
    system_prompt text NOT NULL,
    ai_model varchar(100) NOT NULL,
    created_at timestamp NOT NULL DEFAULT
  CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT
  CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  );