import { mysqlTable, varchar, text, timestamp, json, boolean, serial, decimal, int, mysqlEnum, index, uniqueIndex, bigint, datetime } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
// Example schema for workflow-related tables
export const workflows = mysqlTable('workflows', {
    id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    definition: json('definition').notNull(), // Store the JSON workflow definition
    version: varchar('version', { length: 50 }).notNull().default('1.0.0'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});
export const workflowExecutions = mysqlTable('workflow_executions', {
    id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
    workflowId: varchar('workflow_id', { length: 128 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, running, completed, failed
    result: json('result'), // Store execution result
    error: text('error'), // Store error message if execution fails
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
});
export const users = mysqlTable('users', {
    id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});
export const aiAgents = mysqlTable('ai_agents', {
    id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
    agentName: varchar('agent_name', { length: 255 }).notNull(),
    description: text('description'),
    systemPrompt: text('system_prompt').notNull(),
    aiModel: varchar('ai_model', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});
// Real Estate Tables
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
    isActive: boolean('is_active').default(true).notNull(),
    subscriptionPlan: mysqlEnum('subscription_plan', ['basic', 'premium', 'enterprise']).default('basic').notNull(),
    subscriptionExpiresAt: timestamp('subscription_expires_at'),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
}, (table) => ({
    emailIdx: uniqueIndex('agencies_email_idx').on(table.email),
    nameIdx: index('agencies_name_idx').on(table.name),
}));
// Agents Table
export const agents = mysqlTable('agents', {
    id: serial('id').primaryKey(),
    agencyId: bigint('agency_id', { mode: 'number', unsigned: true }).references(() => agencies.id).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    whatsapp: varchar('whatsapp', { length: 20 }),
    role: mysqlEnum('role', ['agent', 'senior_agent', 'team_leader', 'manager', 'admin']).default('agent').notNull(),
    licenseNumber: varchar('license_number', { length: 100 }),
    commission: decimal('commission', { precision: 5, scale: 2 }).default('2.50').notNull(),
    territory: json('territory'),
    specialization: json('specialization'),
    isActive: boolean('is_active').default(true).notNull(),
    avatar: varchar('avatar', { length: 500 }),
    bio: text('bio'),
    languages: json('languages').default('["romanian"]').notNull(),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
}, (table) => ({
    emailIdx: uniqueIndex('agents_email_idx').on(table.email),
    agencyIdx: index('agents_agency_idx').on(table.agencyId),
    activeIdx: index('agents_active_idx').on(table.isActive),
}));
// Contacts Table - needs to be defined before properties for forward reference
export const contacts = mysqlTable('contacts', {
    id: serial('id').primaryKey(),
    agencyId: bigint('agency_id', { mode: 'number', unsigned: true }).references(() => agencies.id).notNull(),
    assignedAgentId: bigint('assigned_agent_id', { mode: 'number', unsigned: true }).references(() => agents.id),
    // Basic Info
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    whatsapp: varchar('whatsapp', { length: 20 }),
    // Contact Type & Source
    contactType: mysqlEnum('contact_type', ['lead', 'prospect', 'client', 'proprietar', 'referrer']).default('lead').notNull(),
    source: mysqlEnum('source', [
        'website', 'facebook', 'olx', 'imobiliare_ro', 'storia_ro',
        'referral', 'cold_call', 'walk_in', 'email_campaign', 'whatsapp', 'other'
    ]),
    sourceDetails: varchar('source_details', { length: 255 }),
    // Preferences & Requirements
    interestedIn: mysqlEnum('interested_in', ['cumparare', 'inchiriere', 'vanzare', 'inchiriere_proprietate']),
    budgetMin: decimal('budget_min', { precision: 12, scale: 2 }),
    budgetMax: decimal('budget_max', { precision: 12, scale: 2 }),
    preferredAreas: json('preferred_areas').default('[]').notNull(),
    propertyPreferences: json('property_preferences').default('{}').notNull(),
    urgencyLevel: mysqlEnum('urgency_level', ['scazut', 'mediu', 'ridicat', 'urgent']).default('mediu').notNull(),
    buyingReadiness: mysqlEnum('buying_readiness', ['research', 'considering', 'ready', 'urgent']).default('research').notNull(),
    // Communication
    preferredContactMethod: mysqlEnum('preferred_contact_method', ['email', 'phone', 'whatsapp', 'sms']).default('phone').notNull(),
    bestTimeToCall: varchar('best_time_to_call', { length: 100 }),
    communicationNotes: text('communication_notes'),
    // AI & Scoring
    aiLeadScore: decimal('ai_lead_score', { precision: 5, scale: 2 }).default('0.00').notNull(),
    qualificationStatus: mysqlEnum('qualification_status', ['nequalificat', 'calificat', 'hot_lead', 'customer']).default('nequalificat').notNull(),
    conversionProbability: decimal('conversion_probability', { precision: 5, scale: 2 }),
    lastInteractionScore: decimal('last_interaction_score', { precision: 3, scale: 2 }),
    // Interaction Tracking
    lastContactAt: timestamp('last_contact_at'),
    lastResponseAt: timestamp('last_response_at'),
    nextFollowUpAt: timestamp('next_follow_up_at'),
    interactionCount: int('interaction_count').default(0).notNull(),
    emailCount: int('email_count').default(0).notNull(),
    callCount: int('call_count').default(0).notNull(),
    whatsappCount: int('whatsapp_count').default(0).notNull(),
    meetingCount: int('meeting_count').default(0).notNull(),
    // Additional Info
    occupation: varchar('occupation', { length: 100 }),
    company: varchar('company', { length: 255 }),
    notes: text('notes'),
    tags: json('tags').default('[]').notNull(),
    isBlacklisted: boolean('is_blacklisted').default(false).notNull(),
    gdprConsent: boolean('gdpr_consent').default(false).notNull(),
    marketingConsent: boolean('marketing_consent').default(false).notNull(),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
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
// Properties Table
export const properties = mysqlTable('properties', {
    id: serial('id').primaryKey(),
    agencyId: bigint('agency_id', { mode: 'number', unsigned: true }).references(() => agencies.id).notNull(),
    agentId: bigint('agent_id', { mode: 'number', unsigned: true }).references(() => agents.id).notNull(),
    ownerContactId: bigint('owner_contact_id', { mode: 'number', unsigned: true }).references(() => contacts.id),
    internalCode: varchar('internal_code', { length: 24 }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    propertyType: mysqlEnum('property_type', [
        'apartament', 'casa', 'vila', 'duplex', 'penthouse',
        'studio', 'garsoniera', 'teren', 'spatiu_comercial',
        'birou', 'hala', 'depozit'
    ]).notNull(),
    transactionType: mysqlEnum('transaction_type', ['vanzare', 'inchiriere']).notNull(),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('RON').notNull(),
    pricePerSqm: decimal('price_per_sqm', { precision: 8, scale: 2 }),
    priceHistory: json('price_history').default('[]').notNull(),
    // Location
    county: varchar('county', { length: 100 }),
    city: varchar('city', { length: 100 }),
    sector: varchar('sector', { length: 50 }),
    neighborhood: varchar('neighborhood', { length: 100 }),
    address: text('address'),
    latitude: decimal('latitude', { precision: 10, scale: 8 }),
    longitude: decimal('longitude', { precision: 11, scale: 8 }),
    // Property Details
    surfaceArea: decimal('surface_area', { precision: 8, scale: 2 }),
    builtArea: decimal('built_area', { precision: 8, scale: 2 }),
    landArea: decimal('land_area', { precision: 10, scale: 2 }),
    rooms: int('rooms'),
    bedrooms: int('bedrooms'),
    bathrooms: int('bathrooms'),
    floor: int('floor'),
    totalFloors: int('total_floors'),
    constructionYear: int('construction_year'),
    condition: mysqlEnum('condition', ['nou', 'foarte_bun', 'bun', 'satisfacator', 'renovare']),
    energyClass: mysqlEnum('energy_class', ['A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']),
    // Features & Amenities
    features: json('features').default('[]').notNull(),
    amenities: json('amenities').default('[]').notNull(),
    appliances: json('appliances').default('[]').notNull(),
    // Media & Documents
    photos: json('photos').default('[]').notNull(),
    virtualTourUrl: varchar('virtual_tour_url', { length: 500 }),
    floorPlanUrl: varchar('floor_plan_url', { length: 500 }),
    documents: json('documents').default('[]').notNull(),
    // Status & Availability
    status: mysqlEnum('status', ['activ', 'rezervat', 'vandut', 'inchiriat', 'suspendat', 'expirat']).default('activ').notNull(),
    availableFrom: timestamp('available_from'),
    exclusiveUntil: timestamp('exclusive_until'),
    // AI & Analytics
    aiValuationScore: decimal('ai_valuation_score', { precision: 12, scale: 2 }),
    aiValuationConfidence: decimal('ai_valuation_confidence', { precision: 5, scale: 2 }),
    marketTrendScore: decimal('market_trend_score', { precision: 5, scale: 2 }),
    viewsCount: int('views_count').default(0).notNull(),
    favoritesCount: int('favorites_count').default(0).notNull(),
    inquiriesCount: int('inquiries_count').default(0).notNull(),
    // SEO & Marketing
    slug: varchar('slug', { length: 255 }),
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),
    isPromoted: boolean('is_promoted').default(false).notNull(),
    promotedUntil: timestamp('promoted_until'),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
}, (table) => ({
    agencyIdx: index('properties_agency_idx').on(table.agencyId),
    agentIdx: index('properties_agent_idx').on(table.agentId),
    internalCodeIdx: index('properties_internal_code_idx').on(table.internalCode),
    typeIdx: index('properties_type_idx').on(table.propertyType),
    transactionIdx: index('properties_transaction_idx').on(table.transactionType),
    statusIdx: index('properties_status_idx').on(table.status),
    priceIdx: index('properties_price_idx').on(table.price),
    cityIdx: index('properties_city_idx').on(table.city),
    locationIdx: index('properties_location_idx').on(table.latitude, table.longitude),
    slugIdx: uniqueIndex('properties_slug_idx').on(table.slug),
}));
// Client Requests Table - NEW table for storing client requests for properties
export const clientRequests = mysqlTable('client_requests', {
    id: serial('id').primaryKey(),
    contactId: bigint('contact_id', { mode: 'number', unsigned: true }).references(() => contacts.id).notNull(),
    agencyId: bigint('agency_id', { mode: 'number', unsigned: true }).references(() => agencies.id).notNull(),
    assignedAgentId: bigint('assigned_agent_id', { mode: 'number', unsigned: true }).references(() => agents.id),
    // Request Details
    requestType: mysqlEnum('request_type', ['cumparare', 'inchiriere', 'evaluare', 'vanzare', 'informatii']).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    // Property Criteria
    propertyType: mysqlEnum('property_type', [
        'apartament', 'casa', 'vila', 'duplex', 'penthouse',
        'studio', 'garsoniera', 'teren', 'spatiu_comercial',
        'birou', 'hala', 'depozit'
    ]),
    budgetMin: decimal('budget_min', { precision: 12, scale: 2 }),
    budgetMax: decimal('budget_max', { precision: 12, scale: 2 }),
    preferredLocations: json('preferred_locations').default('[]').notNull(),
    minRooms: int('min_rooms'),
    maxRooms: int('max_rooms'),
    minSurface: decimal('min_surface', { precision: 8, scale: 2 }),
    maxSurface: decimal('max_surface', { precision: 8, scale: 2 }),
    requiredFeatures: json('required_features').default('[]').notNull(),
    preferredFeatures: json('preferred_features').default('[]').notNull(),
    // Request Status & Priority
    status: mysqlEnum('status', ['nou', 'in_procesare', 'match_gasit', 'finalizat', 'anulat']).default('nou').notNull(),
    statusColorCode: varchar('status_color_code', { length: 64 }),
    requestCode: varchar('request_code', { length: 64 }),
    priority: mysqlEnum('priority', ['scazut', 'mediu', 'ridicat', 'urgent']).default('mediu').notNull(),
    urgencyLevel: mysqlEnum('urgency_level', ['flexibil', 'moderat', 'urgent', 'foarte_urgent']).default('flexibil').notNull(),
    propertyId: bigint('property_id', { mode: 'number', unsigned: true }).references(() => properties.id),
    // Timeline
    expectedTimeframe: varchar('expected_timeframe', { length: 100 }),
    deadlineDate: timestamp('deadline_date'),
    // Communication & Follow-up
    preferredContactTime: varchar('preferred_contact_time', { length: 100 }),
    communicationPreferences: json('communication_preferences').default('["phone"]').notNull(),
    lastContactAt: timestamp('last_contact_at'),
    nextFollowUpAt: timestamp('next_follow_up_at'),
    // AI & Matching
    aiMatchingCriteria: json('ai_matching_criteria').default('{}').notNull(),
    autoMatchEnabled: boolean('auto_match_enabled').default(true).notNull(),
    matchCount: int('match_count').default(0).notNull(),
    lastMatchedAt: timestamp('last_matched_at'),
    // Internal Notes
    internalNotes: text('internal_notes'),
    clientNotes: text('client_notes'),
    tags: json('tags').default('[]').notNull(),
    // Tracking
    source: mysqlEnum('source', [
        'website_form', 'phone_call', 'email', 'whatsapp', 'walk_in',
        'referral', 'social_media', 'advertisement', 'other'
    ]).default('website_form').notNull(),
    sourceDetails: varchar('source_details', { length: 255 }),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
}, (table) => ({
    contactIdx: index('client_requests_contact_idx').on(table.contactId),
    agencyIdx: index('client_requests_agency_idx').on(table.agencyId),
    agentIdx: index('client_requests_agent_idx').on(table.assignedAgentId),
    statusIdx: index('client_requests_status_idx').on(table.status),
    propertyIdx: index('client_requests_property_idx').on(table.propertyId),
    typeIdx: index('client_requests_type_idx').on(table.requestType),
    priorityIdx: index('client_requests_priority_idx').on(table.priority),
    urgencyIdx: index('client_requests_urgency_idx').on(table.urgencyLevel),
    budgetIdx: index('client_requests_budget_idx').on(table.budgetMin, table.budgetMax),
    deadlineIdx: index('client_requests_deadline_idx').on(table.deadlineDate),
    autoMatchIdx: index('client_requests_auto_match_idx').on(table.autoMatchEnabled),
}));
// Activities Table - Real Estate Activities (Calls, Meetings, Viewings, etc.)
export const activities = mysqlTable('activities', {
    id: serial('id').primaryKey(),
    originalActivityId: varchar('original_activity_id', { length: 50 }), // From source system
    // References  
    agencyId: bigint('agency_id', { mode: 'number', unsigned: true }).references(() => agencies.id).notNull(),
    agentId: bigint('agent_id', { mode: 'number', unsigned: true }).references(() => agents.id).notNull(),
    contactId: bigint('contact_id', { mode: 'number', unsigned: true }).references(() => contacts.id),
    propertyId: bigint('property_id', { mode: 'number', unsigned: true }).references(() => properties.id),
    requestId: bigint('request_id', { mode: 'number', unsigned: true }).references(() => clientRequests.id),
    // Activity Details
    name: varchar('name', { length: 255 }).notNull(),
    memo: text('memo'),
    activityType: mysqlEnum('activity_type', [
        'call', 'meeting', 'viewing', 'task', 'other'
    ]).notNull(),
    // Status & UI Data
    status: mysqlEnum('status', ['future', 'inprogress', 'passed', 'completed', 'cancelled']).default('future').notNull(),
    statusClass: varchar('status_class', { length: 100 }),
    statusIcon: varchar('status_icon', { length: 100 }),
    // Type Metadata
    typeColor: varchar('type_color', { length: 50 }),
    typeIcon: varchar('type_icon', { length: 100 }),
    typeDuration: int('type_duration'), // in minutes
    // Scheduling
    scheduledDate: varchar('scheduled_date', { length: 50 }), // Store as received: "18-09-2025"
    scheduledTime: varchar('scheduled_time', { length: 50 }), // Store as received: "09:00:00"
    scheduledDateTime: timestamp('scheduled_datetime'), // Parsed datetime for queries
    // Contact Information (for lookups and denormalization)
    contactName: varchar('contact_name', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 20 }),
    // Property Information (for lookups and denormalization)
    propertyCode: varchar('property_code', { length: 20 }),
    // Request Information (for lookups and denormalization) 
    requestCode: varchar('request_code', { length: 20 }),
    // Agent Information (denormalized for performance)
    agentName: varchar('agent_name', { length: 255 }),
    // URLs and External References
    editUrl: varchar('edit_url', { length: 500 }),
    slideUrl: varchar('slide_url', { length: 500 }),
    // Metadata
    isImported: boolean('is_imported').default(true).notNull(),
    importedAt: timestamp('imported_at').defaultNow(),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    agencyIdx: index('activities_agency_idx').on(table.agencyId),
    agentIdx: index('activities_agent_idx').on(table.agentId),
    contactIdx: index('activities_contact_idx').on(table.contactId),
    propertyIdx: index('activities_property_idx').on(table.propertyId),
    requestIdx: index('activities_request_idx').on(table.requestId),
    typeIdx: index('activities_type_idx').on(table.activityType),
    statusIdx: index('activities_status_idx').on(table.status),
    scheduledIdx: index('activities_scheduled_idx').on(table.scheduledDateTime),
    originalIdIdx: index('activities_original_id_idx').on(table.originalActivityId),
    phoneIdx: index('activities_phone_idx').on(table.contactPhone),
    propertyCodeIdx: index('activities_property_code_idx').on(table.propertyCode),
    requestCodeIdx: index('activities_request_code_idx').on(table.requestCode),
}));
// Continue with remaining tables from the original schema...
// AI Lead Scores Table
export const aiLeadScores = mysqlTable('ai_lead_scores', {
    id: serial('id').primaryKey(),
    contactId: bigint('contact_id', { mode: 'number', unsigned: true }).references(() => contacts.id).notNull(),
    // Scoring
    overallScore: decimal('overall_score', { precision: 5, scale: 2 }).notNull(),
    behaviorScore: decimal('behavior_score', { precision: 5, scale: 2 }),
    engagementScore: decimal('engagement_score', { precision: 5, scale: 2 }),
    budgetAlignmentScore: decimal('budget_alignment_score', { precision: 5, scale: 2 }),
    urgencyScore: decimal('urgency_score', { precision: 5, scale: 2 }),
    // Factors & Details
    scoringFactors: json('scoring_factors').default('{}').notNull(),
    modelVersion: varchar('model_version', { length: 50 }),
    confidenceLevel: decimal('confidence_level', { precision: 5, scale: 2 }),
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
}, (table) => ({
    contactIdx: index('ai_lead_scores_contact_idx').on(table.contactId),
    scoreIdx: index('ai_lead_scores_score_idx').on(table.overallScore),
    updatedIdx: index('ai_lead_scores_updated_idx').on(table.lastUpdated),
}));
// Property Valuations Table
export const propertyValuations = mysqlTable('property_valuations', {
    id: serial('id').primaryKey(),
    propertyId: bigint('property_id', { mode: 'number', unsigned: true }).references(() => properties.id).notNull(),
    // Valuation
    aiEstimatedValue: decimal('ai_estimated_value', { precision: 12, scale: 2 }).notNull(),
    confidenceLevel: decimal('confidence_level', { precision: 5, scale: 2 }),
    valuationRange: json('valuation_range'),
    // Market Analysis
    marketFactors: json('market_factors').default('{}').notNull(),
    comparableProperties: json('comparable_properties').default('[]').notNull(),
    marketTrend: mysqlEnum('market_trend', ['crescator', 'stabil', 'descrescator']),
    // Model Info
    modelVersion: varchar('model_version', { length: 50 }),
    dataPoints: int('data_points'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    propertyIdx: index('property_valuations_property_idx').on(table.propertyId),
    valueIdx: index('property_valuations_value_idx').on(table.aiEstimatedValue),
    createdIdx: index('property_valuations_created_idx').on(table.createdAt),
}));
// Client Property Matches Table
export const clientPropertyMatches = mysqlTable('client_property_matches', {
    id: serial('id').primaryKey(),
    contactId: bigint('contact_id', { mode: 'number', unsigned: true }).references(() => contacts.id).notNull(),
    propertyId: bigint('property_id', { mode: 'number', unsigned: true }).references(() => properties.id).notNull(),
    requestId: bigint('request_id', { mode: 'number', unsigned: true }).references(() => clientRequests.id),
    // Matching
    matchScore: decimal('match_score', { precision: 5, scale: 2 }).notNull(),
    matchingFactors: json('matching_factors').default('{}').notNull(),
    recommendationReason: text('recommendation_reason'),
    // Status
    status: mysqlEnum('status', ['recomandat', 'vizualizat', 'interesat', 'respins', 'programat_vizionare']).default('recomandat').notNull(),
    sentAt: timestamp('sent_at'),
    viewedAt: timestamp('viewed_at'),
    respondedAt: timestamp('responded_at'),
    // AI Model Info
    modelVersion: varchar('model_version', { length: 50 }),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
}, (table) => ({
    contactIdx: index('client_property_matches_contact_idx').on(table.contactId),
    propertyIdx: index('client_property_matches_property_idx').on(table.propertyId),
    requestIdx: index('client_property_matches_request_idx').on(table.requestId),
    scoreIdx: index('client_property_matches_score_idx').on(table.matchScore),
    statusIdx: index('client_property_matches_status_idx').on(table.status),
    uniqueMatch: uniqueIndex('client_property_matches_unique').on(table.contactId, table.propertyId),
}));
// Email Templates Table
export const emailTemplates = mysqlTable('email_templates', {
    id: serial('id').primaryKey(),
    agencyId: bigint('agency_id', { mode: 'number', unsigned: true }).references(() => agencies.id).notNull(),
    // Template Details
    name: varchar('name', { length: 255 }).notNull(),
    type: mysqlEnum('type', [
        'welcome', 'follow_up', 'property_recommendation', 'viewing_reminder',
        'market_update', 'contract_milestone', 'newsletter', 'custom'
    ]).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    content: text('content').notNull(),
    // AI & Personalization
    isAiGenerated: boolean('is_ai_generated').default(false).notNull(),
    personalizationFields: json('personalization_fields').default('[]').notNull(),
    // Usage Stats
    usageCount: int('usage_count').default(0).notNull(),
    openRate: decimal('open_rate', { precision: 5, scale: 2 }),
    clickRate: decimal('click_rate', { precision: 5, scale: 2 }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
}, (table) => ({
    agencyIdx: index('email_templates_agency_idx').on(table.agencyId),
    typeIdx: index('email_templates_type_idx').on(table.type),
    activeIdx: index('email_templates_active_idx').on(table.isActive),
}));
// WhatsApp Conversations Table
export const whatsappConversations = mysqlTable('whatsapp_conversations', {
    id: serial('id').primaryKey(),
    agencyId: bigint('agency_id', { mode: 'number', unsigned: true }).references(() => agencies.id).notNull(),
    contactId: bigint('contact_id', { mode: 'number', unsigned: true }).references(() => contacts.id).notNull(),
    agentId: bigint('agent_id', { mode: 'number', unsigned: true }).references(() => agents.id),
    // Conversation Details
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    status: mysqlEnum('status', ['active', 'closed', 'transferred', 'escalated']).default('active').notNull(),
    // AI Chatbot
    isBotHandled: boolean('is_bot_handled').default(true).notNull(),
    handoffToAgent: boolean('handoff_to_agent').default(false).notNull(),
    handoffReason: varchar('handoff_reason', { length: 255 }),
    // Context
    currentIntent: varchar('current_intent', { length: 100 }),
    sessionData: json('session_data').default('{}').notNull(),
    lastMessageAt: timestamp('last_message_at'),
    createdAt: timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => new Date()),
}, (table) => ({
    agencyIdx: index('whatsapp_conversations_agency_idx').on(table.agencyId),
    contactIdx: index('whatsapp_conversations_contact_idx').on(table.contactId),
    phoneIdx: index('whatsapp_conversations_phone_idx').on(table.phoneNumber),
    statusIdx: index('whatsapp_conversations_status_idx').on(table.status),
}));
// WhatsApp Messages Table
export const whatsappMessages = mysqlTable('whatsapp_messages', {
    id: serial('id').primaryKey(),
    conversationId: bigint('conversation_id', { mode: 'number', unsigned: true }).references(() => whatsappConversations.id).notNull(),
    // Message Details
    direction: mysqlEnum('direction', ['inbound', 'outbound']).notNull(),
    messageType: mysqlEnum('message_type', ['text', 'image', 'document', 'location', 'contact']).default('text').notNull(),
    content: text('content'),
    mediaUrl: varchar('media_url', { length: 500 }),
    // AI & Bot
    isFromBot: boolean('is_from_bot').default(false).notNull(),
    intent: varchar('intent', { length: 100 }),
    entities: json('entities').default('{}').notNull(),
    confidence: decimal('confidence', { precision: 3, scale: 2 }),
    // WhatsApp Specific
    whatsappMessageId: varchar('whatsapp_message_id', { length: 100 }),
    status: mysqlEnum('status', ['sent', 'delivered', 'read', 'failed']),
    sentAt: timestamp('sent_at').defaultNow().notNull(),
    deliveredAt: timestamp('delivered_at'),
    readAt: timestamp('read_at'),
}, (table) => ({
    conversationIdx: index('whatsapp_messages_conversation_idx').on(table.conversationId),
    directionIdx: index('whatsapp_messages_direction_idx').on(table.direction),
    sentIdx: index('whatsapp_messages_sent_idx').on(table.sentAt),
    whatsappIdIdx: uniqueIndex('whatsapp_messages_wa_id_idx').on(table.whatsappMessageId),
}));
// Automations Table - Workflow automation system
export const automations = mysqlTable('automations', {
    id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
    agencyId: bigint('agency_id', { mode: 'number', unsigned: true }).references(() => agencies.id).notNull(),
    // Basic Information
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    // Trigger Configuration
    triggerType: mysqlEnum('trigger_type', ['immediate', 'cron', 'webhook']).notNull(),
    triggerConfig: json('trigger_config').notNull(), // Store trigger-specific configuration
    // Workflow Reference
    workflowId: varchar('workflow_id', { length: 128 }).references(() => workflows.id).notNull(),
    // Status & Control
    enabled: boolean('enabled').default(true).notNull(),
    // Execution Tracking
    lastRunAt: timestamp('last_run_at'),
    nextRunAt: timestamp('next_run_at'), // For scheduled automations
    runCount: int('run_count').default(0).notNull(),
    successCount: int('success_count').default(0).notNull(),
    failureCount: int('failure_count').default(0).notNull(),
    // Error Handling
    lastError: text('last_error'),
    lastErrorAt: timestamp('last_error_at'),
    // Metadata
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
    agencyIdx: index('automations_agency_idx').on(table.agencyId),
    workflowIdx: index('automations_workflow_idx').on(table.workflowId),
    triggerTypeIdx: index('automations_trigger_type_idx').on(table.triggerType),
    enabledIdx: index('automations_enabled_idx').on(table.enabled),
    nextRunIdx: index('automations_next_run_idx').on(table.nextRunAt),
    nameIdx: index('automations_name_idx').on(table.name),
}));
// Automation Executions Table - Track individual automation runs
export const automationExecutions = mysqlTable('automation_executions', {
    id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
    automationId: varchar('automation_id', { length: 128 }).references(() => automations.id).notNull(),
    workflowExecutionId: varchar('workflow_execution_id', { length: 128 }).references(() => workflowExecutions.id),
    // Execution Details
    status: mysqlEnum('status', ['pending', 'running', 'completed', 'failed']).notNull().default('pending'),
    triggerData: json('trigger_data'), // Data that triggered this execution
    result: json('result'), // Execution result
    error: text('error'), // Error message if execution fails
    // Timing
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    duration: int('duration'), // Execution duration in milliseconds
    // Metadata
    triggerSource: varchar('trigger_source', { length: 100 }), // What triggered this execution
    executionContext: json('execution_context').default('{}').notNull(),
}, (table) => ({
    automationIdx: index('automation_executions_automation_idx').on(table.automationId),
    workflowExecutionIdx: index('automation_executions_workflow_exec_idx').on(table.workflowExecutionId),
    statusIdx: index('automation_executions_status_idx').on(table.status),
    startedIdx: index('automation_executions_started_idx').on(table.startedAt),
}));
// Relations
export const agenciesRelations = relations(agencies, ({ many }) => ({
    agents: many(agents),
    properties: many(properties),
    contacts: many(contacts),
    activities: many(activities),
    clientRequests: many(clientRequests),
    emailTemplates: many(emailTemplates),
    whatsappConversations: many(whatsappConversations),
    automations: many(automations),
}));
export const agentsRelations = relations(agents, ({ one, many }) => ({
    agency: one(agencies, { fields: [agents.agencyId], references: [agencies.id] }),
    properties: many(properties),
    assignedContacts: many(contacts),
    activities: many(activities),
    assignedRequests: many(clientRequests),
    whatsappConversations: many(whatsappConversations),
}));
export const contactsRelations = relations(contacts, ({ one, many }) => ({
    agency: one(agencies, { fields: [contacts.agencyId], references: [agencies.id] }),
    assignedAgent: one(agents, { fields: [contacts.assignedAgentId], references: [agents.id] }),
    activities: many(activities),
    ownedProperties: many(properties),
    clientRequests: many(clientRequests),
    aiLeadScores: many(aiLeadScores),
    propertyMatches: many(clientPropertyMatches),
    whatsappConversations: many(whatsappConversations),
}));
export const propertiesRelations = relations(properties, ({ one, many }) => ({
    agency: one(agencies, { fields: [properties.agencyId], references: [agencies.id] }),
    agent: one(agents, { fields: [properties.agentId], references: [agents.id] }),
    ownerContact: one(contacts, { fields: [properties.ownerContactId], references: [contacts.id] }),
    activities: many(activities),
    relatedRequests: many(clientRequests),
    valuations: many(propertyValuations),
    matches: many(clientPropertyMatches),
}));
export const clientRequestsRelations = relations(clientRequests, ({ one, many }) => ({
    contact: one(contacts, { fields: [clientRequests.contactId], references: [contacts.id] }),
    agency: one(agencies, { fields: [clientRequests.agencyId], references: [agencies.id] }),
    assignedAgent: one(agents, { fields: [clientRequests.assignedAgentId], references: [agents.id] }),
    sourceProperty: one(properties, { fields: [clientRequests.propertyId], references: [properties.id] }),
    activities: many(activities),
    propertyMatches: many(clientPropertyMatches),
}));
export const activitiesRelations = relations(activities, ({ one }) => ({
    agency: one(agencies, { fields: [activities.agencyId], references: [agencies.id] }),
    agent: one(agents, { fields: [activities.agentId], references: [agents.id] }),
    contact: one(contacts, { fields: [activities.contactId], references: [contacts.id] }),
    property: one(properties, { fields: [activities.propertyId], references: [properties.id] }),
    clientRequest: one(clientRequests, { fields: [activities.requestId], references: [clientRequests.id] }),
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
    clientRequest: one(clientRequests, { fields: [clientPropertyMatches.requestId], references: [clientRequests.id] }),
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
export const workflowsRelations = relations(workflows, ({ many }) => ({
    executions: many(workflowExecutions),
    automations: many(automations),
}));
export const automationsRelations = relations(automations, ({ one, many }) => ({
    agency: one(agencies, { fields: [automations.agencyId], references: [agencies.id] }),
    workflow: one(workflows, { fields: [automations.workflowId], references: [workflows.id] }),
    executions: many(automationExecutions),
}));
export const automationExecutionsRelations = relations(automationExecutions, ({ one }) => ({
    automation: one(automations, { fields: [automationExecutions.automationId], references: [automations.id] }),
    workflowExecution: one(workflowExecutions, { fields: [automationExecutions.workflowExecutionId], references: [workflowExecutions.id] }),
}));
