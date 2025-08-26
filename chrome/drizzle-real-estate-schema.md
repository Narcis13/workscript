# Drizzle Schema for AI Real Estate CRM

```typescript
import { mysqlTable, serial, varchar, text, decimal, int, timestamp, json, mysqlEnum, boolean, index, uniqueIndex } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// Real Estate Agencies Table
export const agencies = mysqlTable('agencies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  county: varchar('county', { length: 100 }),
  postalCode: varchar('postal_code', { length: 10 }),
  website: varchar('website', { length: 255 }),
  managerName: varchar('manager_name', { length: 255 }),
  managerEmail: varchar('manager_email', { length: 255 }),
  managerPhone: varchar('manager_phone', { length: 20 }),
  licenseNumber: varchar('license_number', { length: 100 }),
  vatNumber: varchar('vat_number', { length: 20 }),
  isActive: boolean('is_active').default(true),
  subscriptionPlan: mysqlEnum('subscription_plan', ['basic', 'premium', 'enterprise']).default('basic'),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  emailIdx: uniqueIndex('agencies_email_idx').on(table.email),
  nameIdx: index('agencies_name_idx').on(table.name),
}));

// Agents Table
export const agents = mysqlTable('agents', {
  id: serial('id').primaryKey(),
  agencyId: int('agency_id').references(() => agencies.id).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  whatsapp: varchar('whatsapp', { length: 20 }),
  role: mysqlEnum('role', ['agent', 'senior_agent', 'team_leader', 'manager', 'admin']).default('agent'),
  licenseNumber: varchar('license_number', { length: 100 }),
  commission: decimal('commission', { precision: 5, scale: 2 }).default('2.50'), // percentage
  territory: json('territory'), // areas/zones assigned
  specialization: json('specialization'), // property types they focus on
  isActive: boolean('is_active').default(true),
  avatar: varchar('avatar', { length: 500 }),
  bio: text('bio'),
  languages: json('languages').default(['romanian']),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  emailIdx: uniqueIndex('agents_email_idx').on(table.email),
  agencyIdx: index('agents_agency_idx').on(table.agencyId),
  activeIdx: index('agents_active_idx').on(table.isActive),
}));

// Properties Table
export const properties = mysqlTable('properties', {
  id: serial('id').primaryKey(),
  agencyId: int('agency_id').references(() => agencies.id).notNull(),
  agentId: int('agent_id').references(() => agents.id).notNull(),
  ownerContactId: int('owner_contact_id').references(() => contacts.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  propertyType: mysqlEnum('property_type', [
    'apartament', 'casa', 'vila', 'duplex', 'penthouse', 
    'studio', 'garsoniera', 'teren', 'spatiu_comercial', 
    'birou', 'hala', 'depozit'
  ]).notNull(),
  transactionType: mysqlEnum('transaction_type', ['vanzare', 'inchiriere']).notNull(),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('RON'),
  pricePerSqm: decimal('price_per_sqm', { precision: 8, scale: 2 }),
  priceHistory: json('price_history').default([]),
  
  // Location
  county: varchar('county', { length: 100 }),
  city: varchar('city', { length: 100 }),
  sector: varchar('sector', { length: 50 }),
  neighborhood: varchar('neighborhood', { length: 100 }),
  address: text('address'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  
  // Property Details
  surfaceArea: decimal('surface_area', { precision: 8, scale: 2 }), // mp utili
  builtArea: decimal('built_area', { precision: 8, scale: 2 }), // mp construiti
  landArea: decimal('land_area', { precision: 10, scale: 2 }), // mp teren
  rooms: int('rooms'),
  bedrooms: int('bedrooms'),
  bathrooms: int('bathrooms'),
  floor: int('floor'),
  totalFloors: int('total_floors'),
  constructionYear: int('construction_year'),
  condition: mysqlEnum('condition', ['nou', 'foarte_bun', 'bun', 'satisfacator', 'renovare']),
  energyClass: mysqlEnum('energy_class', ['A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']),
  
  // Features & Amenities
  features: json('features').default([]), // balcon, terasa, garaj, etc
  amenities: json('amenities').default([]), // AC, centrala, etc
  appliances: json('appliances').default([]), // electrocasnice incluse
  
  // Media & Documents
  photos: json('photos').default([]), // array of photo URLs
  virtualTourUrl: varchar('virtual_tour_url', { length: 500 }),
  floorPlanUrl: varchar('floor_plan_url', { length: 500 }),
  documents: json('documents').default([]), // contracts, certificates, etc
  
  // Status & Availability
  status: mysqlEnum('status', ['activ', 'rezervat', 'vandut', 'inchiriat', 'suspendat', 'expirat']).default('activ'),
  availableFrom: timestamp('available_from'),
  exclusiveUntil: timestamp('exclusive_until'),
  
  // AI & Analytics
  aiValuationScore: decimal('ai_valuation_score', { precision: 12, scale: 2 }),
  aiValuationConfidence: decimal('ai_valuation_confidence', { precision: 5, scale: 2 }),
  marketTrendScore: decimal('market_trend_score', { precision: 5, scale: 2 }),
  viewsCount: int('views_count').default(0),
  favoritesCount: int('favorites_count').default(0),
  inquiriesCount: int('inquiries_count').default(0),
  
  // SEO & Marketing
  slug: varchar('slug', { length: 255 }),
  seoTitle: varchar('seo_title', { length: 255 }),
  seoDescription: text('seo_description'),
  isPromoted: boolean('is_promoted').default(false),
  promotedUntil: timestamp('promoted_until'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  agencyIdx: index('properties_agency_idx').on(table.agencyId),
  agentIdx: index('properties_agent_idx').on(table.agentId),
  typeIdx: index('properties_type_idx').on(table.propertyType),
  transactionIdx: index('properties_transaction_idx').on(table.transactionType),
  statusIdx: index('properties_status_idx').on(table.status),
  priceIdx: index('properties_price_idx').on(table.price),
  cityIdx: index('properties_city_idx').on(table.city),
  locationIdx: index('properties_location_idx').on(table.latitude, table.longitude),
  slugIdx: uniqueIndex('properties_slug_idx').on(table.slug),
}));

// Contacts Table
export const contacts = mysqlTable('contacts', {
  id: serial('id').primaryKey(),
  agencyId: int('agency_id').references(() => agencies.id).notNull(),
  assignedAgentId: int('assigned_agent_id').references(() => agents.id),
  
  // Basic Info
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  whatsapp: varchar('whatsapp', { length: 20 }),
  
  // Contact Type & Source
  contactType: mysqlEnum('contact_type', ['lead', 'prospect', 'client', 'proprietar', 'referrer']).default('lead'),
  source: mysqlEnum('source', [
    'website', 'facebook', 'olx', 'imobiliare_ro', 'storia_ro',
    'referral', 'cold_call', 'walk_in', 'email_campaign', 'whatsapp', 'other'
  ]),
  sourceDetails: varchar('source_details', { length: 255 }),
  
  // Preferences & Requirements
  interestedIn: mysqlEnum('interested_in', ['cumparare', 'inchiriere', 'vanzare', 'inchiriere_proprietate']),
  budgetMin: decimal('budget_min', { precision: 12, scale: 2 }),
  budgetMax: decimal('budget_max', { precision: 12, scale: 2 }),
  preferredAreas: json('preferred_areas').default([]),
  propertyPreferences: json('property_preferences').default({}), // type, rooms, features
  urgencyLevel: mysqlEnum('urgency_level', ['scazut', 'mediu', 'ridicat', 'urgent']).default('mediu'),
  buyingReadiness: mysqlEnum('buying_readiness', ['research', 'considering', 'ready', 'urgent']).default('research'),
  
  // Communication
  preferredContactMethod: mysqlEnum('preferred_contact_method', ['email', 'phone', 'whatsapp', 'sms']).default('phone'),
  bestTimeToCall: varchar('best_time_to_call', { length: 100 }),
  communicationNotes: text('communication_notes'),
  
  // AI & Scoring
  aiLeadScore: decimal('ai_lead_score', { precision: 5, scale: 2 }).default('0.00'),
  qualificationStatus: mysqlEnum('qualification_status', ['nequalificat', 'calificat', 'hot_lead', 'customer']).default('nequalificat'),
  conversionProbability: decimal('conversion_probability', { precision: 5, scale: 2 }),
  lastInteractionScore: decimal('last_interaction_score', { precision: 3, scale: 2 }),
  
  // Interaction Tracking
  lastContactAt: timestamp('last_contact_at'),
  lastResponseAt: timestamp('last_response_at'),
  nextFollowUpAt: timestamp('next_follow_up_at'),
  interactionCount: int('interaction_count').default(0),
  emailCount: int('email_count').default(0),
  callCount: int('call_count').default(0),
  whatsappCount: int('whatsapp_count').default(0),
  meetingCount: int('meeting_count').default(0),
  
  // Additional Info
  occupation: varchar('occupation', { length: 100 }),
  company: varchar('company', { length: 255 }),
  notes: text('notes'),
  tags: json('tags').default([]),
  isBlacklisted: boolean('is_blacklisted').default(false),
  gdprConsent: boolean('gdpr_consent').default(false),
  marketingConsent: boolean('marketing_consent').default(false),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  agencyIdx: index('contacts_agency_idx').on(table.agencyId),
  agentIdx: index('contacts_agent_idx').on(table.assignedAgentId),
  emailIdx: index('contacts_email_idx').on(table.email),
  phoneIdx: index('contacts_phone_idx').on(table.phone),
  typeIdx: index('contacts_type_idx').on(table.contactType),
  sourceIdx: index('contacts_source_idx').on(table.source),
  scoreIdx: index('contacts_score_idx').on(table.aiLeadScore),
  qualificationIdx: index('contacts_qualification_idx').on(table.qualificationStatus),
}));

// Activities Table
export const activities = mysqlTable('activities', {
  id: serial('id').primaryKey(),
  agencyId: int('agency_id').references(() => agencies.id).notNull(),
  agentId: int('agent_id').references(() => agents.id).notNull(),
  contactId: int('contact_id').references(() => contacts.id),
  propertyId: int('property_id').references(() => properties.id),
  
  // Activity Details
  activityType: mysqlEnum('activity_type', [
    'email', 'telefon', 'whatsapp', 'sms', 'intalnire', 
    'vizionare', 'prezentare', 'negociere', 'contract', 'nota'
  ]).notNull(),
  status: mysqlEnum('status', ['programat', 'in_desfasurare', 'finalizat', 'anulat', 'amanat']).default('programat'),
  priority: mysqlEnum('priority', ['scazut', 'mediu', 'ridicat', 'urgent']).default('mediu'),
  
  // Content
  subject: varchar('subject', { length: 255 }).notNull(),
  description: text('description'),
  outcome: text('outcome'),
  notes: text('notes'),
  
  // Timing
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  duration: int('duration'), // minutes
  
  // AI & Automation
  isAiGenerated: boolean('is_ai_generated').default(false),
  aiTemplate: varchar('ai_template', { length: 100 }),
  sentimentAnalysisScore: decimal('sentiment_analysis_score', { precision: 3, scale: 2 }),
  
  // Follow-up
  followUpRequired: boolean('follow_up_required').default(false),
  nextAction: varchar('next_action', { length: 255 }),
  nextActionDate: timestamp('next_action_date'),
  
  // Communication specific
  emailSubject: varchar('email_subject', { length: 255 }),
  emailDelivered: boolean('email_delivered'),
  emailOpened: boolean('email_opened'),
  emailClicked: boolean('email_clicked'),
  callDirection: mysqlEnum('call_direction', ['inbound', 'outbound']),
  callDuration: int('call_duration'), // seconds
  callRecordingUrl: varchar('call_recording_url', { length: 500 }),
  
  // Attachments
  attachments: json('attachments').default([]),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  agencyIdx: index('activities_agency_idx').on(table.agencyId),
  agentIdx: index('activities_agent_idx').on(table.agentId),
  contactIdx: index('activities_contact_idx').on(table.contactId),
  propertyIdx: index('activities_property_idx').on(table.propertyId),
  typeIdx: index('activities_type_idx').on(table.activityType),
  statusIdx: index('activities_status_idx').on(table.status),
  scheduledIdx: index('activities_scheduled_idx').on(table.scheduledAt),
  followUpIdx: index('activities_followup_idx').on(table.followUpRequired, table.nextActionDate),
}));

// AI Lead Scores Table
export const aiLeadScores = mysqlTable('ai_lead_scores', {
  id: serial('id').primaryKey(),
  contactId: int('contact_id').references(() => contacts.id).notNull(),
  
  // Scoring
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }).notNull(),
  behaviorScore: decimal('behavior_score', { precision: 5, scale: 2 }),
  engagementScore: decimal('engagement_score', { precision: 5, scale: 2 }),
  budgetAlignmentScore: decimal('budget_alignment_score', { precision: 5, scale: 2 }),
  urgencyScore: decimal('urgency_score', { precision: 5, scale: 2 }),
  
  // Factors & Details
  scoringFactors: json('scoring_factors').default({}),
  modelVersion: varchar('model_version', { length: 50 }),
  confidenceLevel: decimal('confidence_level', { precision: 5, scale: 2 }),
  
  lastUpdated: timestamp('last_updated').defaultNow(),
}, (table) => ({
  contactIdx: index('ai_lead_scores_contact_idx').on(table.contactId),
  scoreIdx: index('ai_lead_scores_score_idx').on(table.overallScore),
  updatedIdx: index('ai_lead_scores_updated_idx').on(table.lastUpdated),
}));

// Property Valuations Table
export const propertyValuations = mysqlTable('property_valuations', {
  id: serial('id').primaryKey(),
  propertyId: int('property_id').references(() => properties.id).notNull(),
  
  // Valuation
  aiEstimatedValue: decimal('ai_estimated_value', { precision: 12, scale: 2 }).notNull(),
  confidenceLevel: decimal('confidence_level', { precision: 5, scale: 2 }),
  valuationRange: json('valuation_range'), // {min, max}
  
  // Market Analysis
  marketFactors: json('market_factors').default({}),
  comparableProperties: json('comparable_properties').default([]),
  marketTrend: mysqlEnum('market_trend', ['crescator', 'stabil', 'descrescator']),
  
  // Model Info
  modelVersion: varchar('model_version', { length: 50 }),
  dataPoints: int('data_points'), // number of comparables used
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  propertyIdx: index('property_valuations_property_idx').on(table.propertyId),
  valueIdx: index('property_valuations_value_idx').on(table.aiEstimatedValue),
  createdIdx: index('property_valuations_created_idx').on(table.createdAt),
}));

// Client Property Matches Table
export const clientPropertyMatches = mysqlTable('client_property_matches', {
  id: serial('id').primaryKey(),
  contactId: int('contact_id').references(() => contacts.id).notNull(),
  propertyId: int('property_id').references(() => properties.id).notNull(),
  
  // Matching
  matchScore: decimal('match_score', { precision: 5, scale: 2 }).notNull(),
  matchingFactors: json('matching_factors').default({}),
  recommendationReason: text('recommendation_reason'),
  
  // Status
  status: mysqlEnum('status', ['recomandat', 'vizualizat', 'interesat', 'respins', 'programat_vizionare']).default('recomandat'),
  sentAt: timestamp('sent_at'),
  viewedAt: timestamp('viewed_at'),
  respondedAt: timestamp('responded_at'),
  
  // AI Model Info
  modelVersion: varchar('model_version', { length: 50 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  contactIdx: index('client_property_matches_contact_idx').on(table.contactId),
  propertyIdx: index('client_property_matches_property_idx').on(table.propertyId),
  scoreIdx: index('client_property_matches_score_idx').on(table.matchScore),
  statusIdx: index('client_property_matches_status_idx').on(table.status),
  uniqueMatch: uniqueIndex('client_property_matches_unique').on(table.contactId, table.propertyId),
}));

// Email Templates Table
export const emailTemplates = mysqlTable('email_templates', {
  id: serial('id').primaryKey(),
  agencyId: int('agency_id').references(() => agencies.id).notNull(),
  
  // Template Details
  name: varchar('name', { length: 255 }).notNull(),
  type: mysqlEnum('type', [
    'welcome', 'follow_up', 'property_recommendation', 'viewing_reminder',
    'market_update', 'contract_milestone', 'newsletter', 'custom'
  ]).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  content: text('content').notNull(),
  
  // AI & Personalization
  isAiGenerated: boolean('is_ai_generated').default(false),
  personalizationFields: json('personalization_fields').default([]),
  
  // Usage Stats
  usageCount: int('usage_count').default(0),
  openRate: decimal('open_rate', { precision: 5, scale: 2 }),
  clickRate: decimal('click_rate', { precision: 5, scale: 2 }),
  
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  agencyIdx: index('email_templates_agency_idx').on(table.agencyId),
  typeIdx: index('email_templates_type_idx').on(table.type),
  activeIdx: index('email_templates_active_idx').on(table.isActive),
}));

// WhatsApp Conversations Table
export const whatsappConversations = mysqlTable('whatsapp_conversations', {
  id: serial('id').primaryKey(),
  agencyId: int('agency_id').references(() => agencies.id).notNull(),
  contactId: int('contact_id').references(() => contacts.id).notNull(),
  agentId: int('agent_id').references(() => agents.id),
  
  // Conversation Details
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  status: mysqlEnum('status', ['active', 'closed', 'transferred', 'escalated']).default('active'),
  
  // AI Chatbot
  isBotHandled: boolean('is_bot_handled').default(true),
  handoffToAgent: boolean('handoff_to_agent').default(false),
  handoffReason: varchar('handoff_reason', { length: 255 }),
  
  // Context
  currentIntent: varchar('current_intent', { length: 100 }),
  sessionData: json('session_data').default({}),
  
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  agencyIdx: index('whatsapp_conversations_agency_idx').on(table.agencyId),
  contactIdx: index('whatsapp_conversations_contact_idx').on(table.contactId),
  phoneIdx: index('whatsapp_conversations_phone_idx').on(table.phoneNumber),
  statusIdx: index('whatsapp_conversations_status_idx').on(table.status),
}));

// WhatsApp Messages Table
export const whatsappMessages = mysqlTable('whatsapp_messages', {
  id: serial('id').primaryKey(),
  conversationId: int('conversation_id').references(() => whatsappConversations.id).notNull(),
  
  // Message Details
  direction: mysqlEnum('direction', ['inbound', 'outbound']).notNull(),
  messageType: mysqlEnum('message_type', ['text', 'image', 'document', 'location', 'contact']).default('text'),
  content: text('content'),
  mediaUrl: varchar('media_url', { length: 500 }),
  
  // AI & Bot
  isFromBot: boolean('is_from_bot').default(false),
  intent: varchar('intent', { length: 100 }),
  entities: json('entities').default({}),
  confidence: decimal('confidence', { precision: 3, scale: 2 }),
  
  // WhatsApp Specific
  whatsappMessageId: varchar('whatsapp_message_id', { length: 100 }),
  status: mysqlEnum('status', ['sent', 'delivered', 'read', 'failed']),
  
  sentAt: timestamp('sent_at').defaultNow(),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
}, (table) => ({
  conversationIdx: index('whatsapp_messages_conversation_idx').on(table.conversationId),
  directionIdx: index('whatsapp_messages_direction_idx').on(table.direction),
  sentIdx: index('whatsapp_messages_sent_idx').on(table.sentAt),
  whatsappIdIdx: uniqueIndex('whatsapp_messages_wa_id_idx').on(table.whatsappMessageId),
}));

// Relations
export const agenciesRelations = relations(agencies, ({ many }) => ({
  agents: many(agents),
  properties: many(properties),
  contacts: many(contacts),
  activities: many(activities),
  emailTemplates: many(emailTemplates),
  whatsappConversations: many(whatsappConversations),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  agency: one(agencies, { fields: [agents.agencyId], references: [agencies.id] }),
  properties: many(properties),
  assignedContacts: many(contacts),
  activities: many(activities),
  whatsappConversations: many(whatsappConversations),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  agency: one(agencies, { fields: [properties.agencyId], references: [agencies.id] }),
  agent: one(agents, { fields: [properties.agentId], references: [agents.id] }),
  ownerContact: one(contacts, { fields: [properties.ownerContactId], references: [contacts.id] }),
  activities: many(activities),
  valuations: many(propertyValuations),
  matches: many(clientPropertyMatches),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  agency: one(agencies, { fields: [contacts.agencyId], references: [agencies.id] }),
  assignedAgent: one(agents, { fields: [contacts.assignedAgentId], references: [agents.id] }),
  activities: many(activities),
  ownedProperties: many(properties),
  aiLeadScores: many(aiLeadScores),
  propertyMatches: many(clientPropertyMatches),
  whatsappConversations: many(whatsappConversations),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  agency: one(agencies, { fields: [activities.agencyId], references: [agencies.id] }),
  agent: one(agents, { fields: [activities.agentId], references: [agents.id] }),
  contact: one(contacts, { fields: [activities.contactId], references: [contacts.id] }),
  property: one(properties, { fields: [activities.propertyId], references: [properties.id] }),
}));

export const aiLeadScoresRelations = relations(aiLeadScores, ({ one }) => ({
  contact: one(contacts, { fields: [aiLeadScores.contactId], references: [contacts.id] }),
}));

export const propertyValuationsRelations = relations(propertyValuations, ({ one }) => ({
  property: one(properties, { fields: [propertyValuations.propertyId], references: [properties.id] }),
}));

export const clientPropertyMatchesRelations = relations(clientPropertyMatches, ({ one }) => ({
  contact: one(contacts, { fields: [clientPropertyMatches.contactId], references: [contacts.id] }),
  property: one(properties, { fields: [clientPropertyMatches.propertyId], references: [properties.id] }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  agency: one(agencies, { fields: [emailTemplates.agencyId], references: [agencies.id] }),
}));

export const whatsappConversationsRelations = relations(whatsappConversations, ({ one, many }) => ({
  agency: one(agencies, { fields: [whatsappConversations.agencyId], references: [agencies.id] }),
  contact: one(contacts, { fields: [whatsappConversations.contactId], references: [contacts.id] }),
  agent: one(agents, { fields: [whatsappConversations.agentId], references: [agents.id] }),
  messages: many(whatsappMessages),
}));

export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  conversation: one(whatsappConversations, { fields: [whatsappMessages.conversationId], references: [whatsappConversations.id] }),
}));
```