CREATE TABLE `activities` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`agent_id` int NOT NULL,
	`contact_id` int,
	`property_id` int,
	`request_id` int,
	`activity_type` enum('email','telefon','whatsapp','sms','intalnire','vizionare','prezentare','negociere','contract','nota') NOT NULL,
	`status` enum('programat','in_desfasurare','finalizat','anulat','amanat') NOT NULL DEFAULT 'programat',
	`priority` enum('scazut','mediu','ridicat','urgent') NOT NULL DEFAULT 'mediu',
	`subject` varchar(255) NOT NULL,
	`description` text,
	`outcome` text,
	`notes` text,
	`scheduled_at` timestamp,
	`started_at` timestamp,
	`completed_at` timestamp,
	`duration` int,
	`is_ai_generated` boolean NOT NULL DEFAULT false,
	`ai_template` varchar(100),
	`sentiment_analysis_score` decimal(3,2),
	`follow_up_required` boolean NOT NULL DEFAULT false,
	`next_action` varchar(255),
	`next_action_date` timestamp,
	`email_subject` varchar(255),
	`email_delivered` boolean,
	`email_opened` boolean,
	`email_clicked` boolean,
	`call_direction` enum('inbound','outbound'),
	`call_duration` int,
	`call_recording_url` varchar(500),
	`attachments` json NOT NULL DEFAULT ('[]'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agencies` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(20),
	`address` text,
	`city` varchar(100),
	`county` varchar(100),
	`postal_code` varchar(10),
	`website` varchar(255),
	`manager_name` varchar(255),
	`manager_email` varchar(255),
	`manager_phone` varchar(20),
	`license_number` varchar(100),
	`vat_number` varchar(20),
	`is_active` boolean NOT NULL DEFAULT true,
	`subscription_plan` enum('basic','premium','enterprise') NOT NULL DEFAULT 'basic',
	`subscription_expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `agencies_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(20),
	`whatsapp` varchar(20),
	`role` enum('agent','senior_agent','team_leader','manager','admin') NOT NULL DEFAULT 'agent',
	`license_number` varchar(100),
	`commission` decimal(5,2) NOT NULL DEFAULT '2.50',
	`territory` json,
	`specialization` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`avatar` varchar(500),
	`bio` text,
	`languages` json NOT NULL DEFAULT ('["romanian"]'),
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `agents_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `ai_lead_scores` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`contact_id` int NOT NULL,
	`overall_score` decimal(5,2) NOT NULL,
	`behavior_score` decimal(5,2),
	`engagement_score` decimal(5,2),
	`budget_alignment_score` decimal(5,2),
	`urgency_score` decimal(5,2),
	`scoring_factors` json NOT NULL DEFAULT ('{}'),
	`model_version` varchar(50),
	`confidence_level` decimal(5,2),
	`last_updated` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_lead_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_property_matches` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`contact_id` int NOT NULL,
	`property_id` int NOT NULL,
	`request_id` int,
	`match_score` decimal(5,2) NOT NULL,
	`matching_factors` json NOT NULL DEFAULT ('{}'),
	`recommendation_reason` text,
	`status` enum('recomandat','vizualizat','interesat','respins','programat_vizionare') NOT NULL DEFAULT 'recomandat',
	`sent_at` timestamp,
	`viewed_at` timestamp,
	`responded_at` timestamp,
	`model_version` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_property_matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_property_matches_unique` UNIQUE(`contact_id`,`property_id`)
);
--> statement-breakpoint
CREATE TABLE `client_requests` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`contact_id` int NOT NULL,
	`agency_id` int NOT NULL,
	`assigned_agent_id` int,
	`request_type` enum('cumparare','inchiriere','evaluare','vanzare','informatii') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`property_type` enum('apartament','casa','vila','duplex','penthouse','studio','garsoniera','teren','spatiu_comercial','birou','hala','depozit'),
	`budget_min` decimal(12,2),
	`budget_max` decimal(12,2),
	`preferred_locations` json NOT NULL DEFAULT ('[]'),
	`min_rooms` int,
	`max_rooms` int,
	`min_surface` decimal(8,2),
	`max_surface` decimal(8,2),
	`required_features` json NOT NULL DEFAULT ('[]'),
	`preferred_features` json NOT NULL DEFAULT ('[]'),
	`status` enum('nou','in_procesare','match_gasit','finalizat','anulat') NOT NULL DEFAULT 'nou',
	`priority` enum('scazut','mediu','ridicat','urgent') NOT NULL DEFAULT 'mediu',
	`urgency_level` enum('flexibil','moderat','urgent','foarte_urgent') NOT NULL DEFAULT 'flexibil',
	`expected_timeframe` varchar(100),
	`deadline_date` timestamp,
	`preferred_contact_time` varchar(100),
	`communication_preferences` json NOT NULL DEFAULT ('["phone"]'),
	`last_contact_at` timestamp,
	`next_follow_up_at` timestamp,
	`ai_matching_criteria` json NOT NULL DEFAULT ('{}'),
	`auto_match_enabled` boolean NOT NULL DEFAULT true,
	`match_count` int NOT NULL DEFAULT 0,
	`last_matched_at` timestamp,
	`internal_notes` text,
	`client_notes` text,
	`tags` json NOT NULL DEFAULT ('[]'),
	`source` enum('website_form','phone_call','email','whatsapp','walk_in','referral','social_media','advertisement','other') NOT NULL DEFAULT 'website_form',
	`source_details` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`assigned_agent_id` int,
	`first_name` varchar(100),
	`last_name` varchar(100),
	`email` varchar(255),
	`phone` varchar(20),
	`whatsapp` varchar(20),
	`contact_type` enum('lead','prospect','client','proprietar','referrer') NOT NULL DEFAULT 'lead',
	`source` enum('website','facebook','olx','imobiliare_ro','storia_ro','referral','cold_call','walk_in','email_campaign','whatsapp','other'),
	`source_details` varchar(255),
	`interested_in` enum('cumparare','inchiriere','vanzare','inchiriere_proprietate'),
	`budget_min` decimal(12,2),
	`budget_max` decimal(12,2),
	`preferred_areas` json NOT NULL DEFAULT ('[]'),
	`property_preferences` json NOT NULL DEFAULT ('{}'),
	`urgency_level` enum('scazut','mediu','ridicat','urgent') NOT NULL DEFAULT 'mediu',
	`buying_readiness` enum('research','considering','ready','urgent') NOT NULL DEFAULT 'research',
	`preferred_contact_method` enum('email','phone','whatsapp','sms') NOT NULL DEFAULT 'phone',
	`best_time_to_call` varchar(100),
	`communication_notes` text,
	`ai_lead_score` decimal(5,2) NOT NULL DEFAULT '0.00',
	`qualification_status` enum('nequalificat','calificat','hot_lead','customer') NOT NULL DEFAULT 'nequalificat',
	`conversion_probability` decimal(5,2),
	`last_interaction_score` decimal(3,2),
	`last_contact_at` timestamp,
	`last_response_at` timestamp,
	`next_follow_up_at` timestamp,
	`interaction_count` int NOT NULL DEFAULT 0,
	`email_count` int NOT NULL DEFAULT 0,
	`call_count` int NOT NULL DEFAULT 0,
	`whatsapp_count` int NOT NULL DEFAULT 0,
	`meeting_count` int NOT NULL DEFAULT 0,
	`occupation` varchar(100),
	`company` varchar(255),
	`notes` text,
	`tags` json NOT NULL DEFAULT ('[]'),
	`is_blacklisted` boolean NOT NULL DEFAULT false,
	`gdpr_consent` boolean NOT NULL DEFAULT false,
	`marketing_consent` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('welcome','follow_up','property_recommendation','viewing_reminder','market_update','contract_milestone','newsletter','custom') NOT NULL,
	`subject` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`is_ai_generated` boolean NOT NULL DEFAULT false,
	`personalization_fields` json NOT NULL DEFAULT ('[]'),
	`usage_count` int NOT NULL DEFAULT 0,
	`open_rate` decimal(5,2),
	`click_rate` decimal(5,2),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`agent_id` int NOT NULL,
	`owner_contact_id` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`property_type` enum('apartament','casa','vila','duplex','penthouse','studio','garsoniera','teren','spatiu_comercial','birou','hala','depozit') NOT NULL,
	`transaction_type` enum('vanzare','inchiriere') NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'RON',
	`price_per_sqm` decimal(8,2),
	`price_history` json NOT NULL DEFAULT ('[]'),
	`county` varchar(100),
	`city` varchar(100),
	`sector` varchar(50),
	`neighborhood` varchar(100),
	`address` text,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`surface_area` decimal(8,2),
	`built_area` decimal(8,2),
	`land_area` decimal(10,2),
	`rooms` int,
	`bedrooms` int,
	`bathrooms` int,
	`floor` int,
	`total_floors` int,
	`construction_year` int,
	`condition` enum('nou','foarte_bun','bun','satisfacator','renovare'),
	`energy_class` enum('A++','A+','A','B','C','D','E','F','G'),
	`features` json NOT NULL DEFAULT ('[]'),
	`amenities` json NOT NULL DEFAULT ('[]'),
	`appliances` json NOT NULL DEFAULT ('[]'),
	`photos` json NOT NULL DEFAULT ('[]'),
	`virtual_tour_url` varchar(500),
	`floor_plan_url` varchar(500),
	`documents` json NOT NULL DEFAULT ('[]'),
	`status` enum('activ','rezervat','vandut','inchiriat','suspendat','expirat') NOT NULL DEFAULT 'activ',
	`available_from` timestamp,
	`exclusive_until` timestamp,
	`ai_valuation_score` decimal(12,2),
	`ai_valuation_confidence` decimal(5,2),
	`market_trend_score` decimal(5,2),
	`views_count` int NOT NULL DEFAULT 0,
	`favorites_count` int NOT NULL DEFAULT 0,
	`inquiries_count` int NOT NULL DEFAULT 0,
	`slug` varchar(255),
	`seo_title` varchar(255),
	`seo_description` text,
	`is_promoted` boolean NOT NULL DEFAULT false,
	`promoted_until` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`),
	CONSTRAINT `properties_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `property_valuations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`property_id` int NOT NULL,
	`ai_estimated_value` decimal(12,2) NOT NULL,
	`confidence_level` decimal(5,2),
	`valuation_range` json,
	`market_factors` json NOT NULL DEFAULT ('{}'),
	`comparable_properties` json NOT NULL DEFAULT ('[]'),
	`market_trend` enum('crescator','stabil','descrescator'),
	`model_version` varchar(50),
	`data_points` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `property_valuations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_conversations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`contact_id` int NOT NULL,
	`agent_id` int,
	`phone_number` varchar(20) NOT NULL,
	`status` enum('active','closed','transferred','escalated') NOT NULL DEFAULT 'active',
	`is_bot_handled` boolean NOT NULL DEFAULT true,
	`handoff_to_agent` boolean NOT NULL DEFAULT false,
	`handoff_reason` varchar(255),
	`current_intent` varchar(100),
	`session_data` json NOT NULL DEFAULT ('{}'),
	`last_message_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`message_type` enum('text','image','document','location','contact') NOT NULL DEFAULT 'text',
	`content` text,
	`media_url` varchar(500),
	`is_from_bot` boolean NOT NULL DEFAULT false,
	`intent` varchar(100),
	`entities` json NOT NULL DEFAULT ('{}'),
	`confidence` decimal(3,2),
	`whatsapp_message_id` varchar(100),
	`status` enum('sent','delivered','read','failed'),
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`delivered_at` timestamp,
	`read_at` timestamp,
	CONSTRAINT `whatsapp_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_messages_wa_id_idx` UNIQUE(`whatsapp_message_id`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_request_id_client_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `client_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_lead_scores` ADD CONSTRAINT `ai_lead_scores_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_property_matches` ADD CONSTRAINT `client_property_matches_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_property_matches` ADD CONSTRAINT `client_property_matches_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_property_matches` ADD CONSTRAINT `client_property_matches_request_id_client_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `client_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_requests` ADD CONSTRAINT `client_requests_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_requests` ADD CONSTRAINT `client_requests_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_requests` ADD CONSTRAINT `client_requests_assigned_agent_id_agents_id_fk` FOREIGN KEY (`assigned_agent_id`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_assigned_agent_id_agents_id_fk` FOREIGN KEY (`assigned_agent_id`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_owner_contact_id_contacts_id_fk` FOREIGN KEY (`owner_contact_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_valuations` ADD CONSTRAINT `property_valuations_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` ADD CONSTRAINT `whatsapp_conversations_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` ADD CONSTRAINT `whatsapp_conversations_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` ADD CONSTRAINT `whatsapp_conversations_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_messages` ADD CONSTRAINT `whatsapp_messages_conversation_id_whatsapp_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `whatsapp_conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activities_agency_idx` ON `activities` (`agency_id`);--> statement-breakpoint
CREATE INDEX `activities_agent_idx` ON `activities` (`agent_id`);--> statement-breakpoint
CREATE INDEX `activities_contact_idx` ON `activities` (`contact_id`);--> statement-breakpoint
CREATE INDEX `activities_property_idx` ON `activities` (`property_id`);--> statement-breakpoint
CREATE INDEX `activities_request_idx` ON `activities` (`request_id`);--> statement-breakpoint
CREATE INDEX `activities_type_idx` ON `activities` (`activity_type`);--> statement-breakpoint
CREATE INDEX `activities_status_idx` ON `activities` (`status`);--> statement-breakpoint
CREATE INDEX `activities_scheduled_idx` ON `activities` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `activities_followup_idx` ON `activities` (`follow_up_required`,`next_action_date`);--> statement-breakpoint
CREATE INDEX `agencies_name_idx` ON `agencies` (`name`);--> statement-breakpoint
CREATE INDEX `agents_agency_idx` ON `agents` (`agency_id`);--> statement-breakpoint
CREATE INDEX `agents_active_idx` ON `agents` (`is_active`);--> statement-breakpoint
CREATE INDEX `ai_lead_scores_contact_idx` ON `ai_lead_scores` (`contact_id`);--> statement-breakpoint
CREATE INDEX `ai_lead_scores_score_idx` ON `ai_lead_scores` (`overall_score`);--> statement-breakpoint
CREATE INDEX `ai_lead_scores_updated_idx` ON `ai_lead_scores` (`last_updated`);--> statement-breakpoint
CREATE INDEX `client_property_matches_contact_idx` ON `client_property_matches` (`contact_id`);--> statement-breakpoint
CREATE INDEX `client_property_matches_property_idx` ON `client_property_matches` (`property_id`);--> statement-breakpoint
CREATE INDEX `client_property_matches_request_idx` ON `client_property_matches` (`request_id`);--> statement-breakpoint
CREATE INDEX `client_property_matches_score_idx` ON `client_property_matches` (`match_score`);--> statement-breakpoint
CREATE INDEX `client_property_matches_status_idx` ON `client_property_matches` (`status`);--> statement-breakpoint
CREATE INDEX `client_requests_contact_idx` ON `client_requests` (`contact_id`);--> statement-breakpoint
CREATE INDEX `client_requests_agency_idx` ON `client_requests` (`agency_id`);--> statement-breakpoint
CREATE INDEX `client_requests_agent_idx` ON `client_requests` (`assigned_agent_id`);--> statement-breakpoint
CREATE INDEX `client_requests_status_idx` ON `client_requests` (`status`);--> statement-breakpoint
CREATE INDEX `client_requests_type_idx` ON `client_requests` (`request_type`);--> statement-breakpoint
CREATE INDEX `client_requests_priority_idx` ON `client_requests` (`priority`);--> statement-breakpoint
CREATE INDEX `client_requests_urgency_idx` ON `client_requests` (`urgency_level`);--> statement-breakpoint
CREATE INDEX `client_requests_budget_idx` ON `client_requests` (`budget_min`,`budget_max`);--> statement-breakpoint
CREATE INDEX `client_requests_deadline_idx` ON `client_requests` (`deadline_date`);--> statement-breakpoint
CREATE INDEX `client_requests_auto_match_idx` ON `client_requests` (`auto_match_enabled`);--> statement-breakpoint
CREATE INDEX `contacts_agency_idx` ON `contacts` (`agency_id`);--> statement-breakpoint
CREATE INDEX `contacts_agent_idx` ON `contacts` (`assigned_agent_id`);--> statement-breakpoint
CREATE INDEX `contacts_email_idx` ON `contacts` (`email`);--> statement-breakpoint
CREATE INDEX `contacts_phone_idx` ON `contacts` (`phone`);--> statement-breakpoint
CREATE INDEX `contacts_type_idx` ON `contacts` (`contact_type`);--> statement-breakpoint
CREATE INDEX `contacts_source_idx` ON `contacts` (`source`);--> statement-breakpoint
CREATE INDEX `contacts_score_idx` ON `contacts` (`ai_lead_score`);--> statement-breakpoint
CREATE INDEX `contacts_qualification_idx` ON `contacts` (`qualification_status`);--> statement-breakpoint
CREATE INDEX `email_templates_agency_idx` ON `email_templates` (`agency_id`);--> statement-breakpoint
CREATE INDEX `email_templates_type_idx` ON `email_templates` (`type`);--> statement-breakpoint
CREATE INDEX `email_templates_active_idx` ON `email_templates` (`is_active`);--> statement-breakpoint
CREATE INDEX `properties_agency_idx` ON `properties` (`agency_id`);--> statement-breakpoint
CREATE INDEX `properties_agent_idx` ON `properties` (`agent_id`);--> statement-breakpoint
CREATE INDEX `properties_type_idx` ON `properties` (`property_type`);--> statement-breakpoint
CREATE INDEX `properties_transaction_idx` ON `properties` (`transaction_type`);--> statement-breakpoint
CREATE INDEX `properties_status_idx` ON `properties` (`status`);--> statement-breakpoint
CREATE INDEX `properties_price_idx` ON `properties` (`price`);--> statement-breakpoint
CREATE INDEX `properties_city_idx` ON `properties` (`city`);--> statement-breakpoint
CREATE INDEX `properties_location_idx` ON `properties` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `property_valuations_property_idx` ON `property_valuations` (`property_id`);--> statement-breakpoint
CREATE INDEX `property_valuations_value_idx` ON `property_valuations` (`ai_estimated_value`);--> statement-breakpoint
CREATE INDEX `property_valuations_created_idx` ON `property_valuations` (`created_at`);--> statement-breakpoint
CREATE INDEX `whatsapp_conversations_agency_idx` ON `whatsapp_conversations` (`agency_id`);--> statement-breakpoint
CREATE INDEX `whatsapp_conversations_contact_idx` ON `whatsapp_conversations` (`contact_id`);--> statement-breakpoint
CREATE INDEX `whatsapp_conversations_phone_idx` ON `whatsapp_conversations` (`phone_number`);--> statement-breakpoint
CREATE INDEX `whatsapp_conversations_status_idx` ON `whatsapp_conversations` (`status`);--> statement-breakpoint
CREATE INDEX `whatsapp_messages_conversation_idx` ON `whatsapp_messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `whatsapp_messages_direction_idx` ON `whatsapp_messages` (`direction`);--> statement-breakpoint
CREATE INDEX `whatsapp_messages_sent_idx` ON `whatsapp_messages` (`sent_at`);