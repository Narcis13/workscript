-- Drop all existing tables to start fresh
-- This will resolve foreign key constraint issues

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS whatsapp_messages;
DROP TABLE IF EXISTS whatsapp_conversations;
DROP TABLE IF EXISTS email_templates;
DROP TABLE IF EXISTS client_property_matches;
DROP TABLE IF EXISTS property_valuations;
DROP TABLE IF EXISTS ai_lead_scores;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS client_requests;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS agencies;
DROP TABLE IF EXISTS workflow_executions;
DROP TABLE IF EXISTS workflows;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;