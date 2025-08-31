-- Migration: Create Activities Table
-- Description: Create the activities table for storing real estate activities (calls, meetings, viewings, etc.)
-- Author: Claude Code
-- Date: 2025-08-31

CREATE TABLE `activities` (
  `id` serial PRIMARY KEY,
  `original_activity_id` varchar(50) NULL,
  
  -- Foreign Key References
  `agency_id` bigint unsigned NOT NULL,
  `agent_id` bigint unsigned NOT NULL,
  `contact_id` bigint unsigned NULL,
  `property_id` bigint unsigned NULL,
  `request_id` bigint unsigned NULL,
  
  -- Activity Details
  `name` varchar(255) NOT NULL,
  `memo` text NULL,
  `activity_type` enum('call', 'meeting', 'viewing', 'task', 'other') NOT NULL,
  
  -- Status & UI Data
  `status` enum('future', 'inprogress', 'passed', 'completed', 'cancelled') NOT NULL DEFAULT 'future',
  `status_class` varchar(100) NULL,
  `status_icon` varchar(100) NULL,
  
  -- Type Metadata
  `type_color` varchar(50) NULL,
  `type_icon` varchar(100) NULL,
  `type_duration` int NULL COMMENT 'Duration in minutes',
  
  -- Scheduling
  `scheduled_date` varchar(50) NULL COMMENT 'Raw date string as received: "18-09-2025"',
  `scheduled_time` varchar(50) NULL COMMENT 'Raw time string as received: "09:00:00"',
  `scheduled_datetime` timestamp NULL COMMENT 'Parsed datetime for queries',
  
  -- Contact Information (denormalized for lookups)
  `contact_name` varchar(255) NULL,
  `contact_phone` varchar(20) NULL,
  
  -- Property Information (denormalized for lookups)
  `property_code` varchar(20) NULL,
  
  -- Request Information (denormalized for lookups)
  `request_code` varchar(20) NULL,
  
  -- Agent Information (denormalized for performance)
  `agent_name` varchar(255) NULL,
  
  -- URLs and External References
  `edit_url` varchar(500) NULL,
  `slide_url` varchar(500) NULL,
  
  -- Metadata
  `is_imported` boolean NOT NULL DEFAULT true,
  `imported_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  -- Timestamps
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Key Constraints
  CONSTRAINT `activities_agency_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE,
  CONSTRAINT `activities_agent_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
  CONSTRAINT `activities_contact_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE SET NULL,
  CONSTRAINT `activities_property_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE SET NULL,
  CONSTRAINT `activities_request_id_fk` FOREIGN KEY (`request_id`) REFERENCES `client_requests`(`id`) ON DELETE SET NULL
);

-- Indexes for performance optimization
CREATE INDEX `activities_agency_idx` ON `activities`(`agency_id`);
CREATE INDEX `activities_agent_idx` ON `activities`(`agent_id`);
CREATE INDEX `activities_contact_idx` ON `activities`(`contact_id`);
CREATE INDEX `activities_property_idx` ON `activities`(`property_id`);
CREATE INDEX `activities_request_idx` ON `activities`(`request_id`);
CREATE INDEX `activities_type_idx` ON `activities`(`activity_type`);
CREATE INDEX `activities_status_idx` ON `activities`(`status`);
CREATE INDEX `activities_scheduled_idx` ON `activities`(`scheduled_datetime`);
CREATE INDEX `activities_original_id_idx` ON `activities`(`original_activity_id`);
CREATE INDEX `activities_phone_idx` ON `activities`(`contact_phone`);
CREATE INDEX `activities_property_code_idx` ON `activities`(`property_code`);
CREATE INDEX `activities_request_code_idx` ON `activities`(`request_code`);

-- Comments for documentation
ALTER TABLE `activities` COMMENT = 'Real estate activities including calls, meetings, viewings, tasks, and other interactions';