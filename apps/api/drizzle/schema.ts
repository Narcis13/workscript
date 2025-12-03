import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, primaryKey, varchar, text, int, decimal, json, tinyint, timestamp, unique, mysqlEnum } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const aiModels = mysqlTable("ai_models", {
	id: varchar({ length: 128 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	contextLength: int("context_length"),
	maxCompletionTokens: int("max_completion_tokens"),
	promptPrice: decimal("prompt_price", { precision: 18, scale: 12 }),
	completionPrice: decimal("completion_price", { precision: 18, scale: 12 }),
	requestPrice: decimal("request_price", { precision: 18, scale: 12 }),
	imagePrice: decimal("image_price", { precision: 18, scale: 12 }),
	modality: varchar({ length: 50 }),
	inputModalities: json("input_modalities"),
	outputModalities: json("output_modalities"),
	tokenizer: varchar({ length: 50 }),
	supportedParameters: json("supported_parameters"),
	isActive: tinyint("is_active").default(1).notNull(),
	lastSyncedAt: timestamp("last_synced_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => {
	return {
		isActiveIdx: index("ai_models_is_active_idx").on(table.isActive),
		lastSyncedAtIdx: index("ai_models_last_synced_at_idx").on(table.lastSyncedAt),
		modalityIdx: index("ai_models_modality_idx").on(table.modality),
		aiModelsId: primaryKey({ columns: [table.id], name: "ai_models_id"}),
	}
});

export const aiUsage = mysqlTable("ai_usage", {
	id: varchar({ length: 128 }).notNull(),
	pluginId: varchar("plugin_id", { length: 128 }).notNull(),
	userId: varchar("user_id", { length: 128 }),
	tenantId: varchar("tenant_id", { length: 128 }),
	modelId: varchar("model_id", { length: 128 }).notNull(),
	promptTokens: int("prompt_tokens").notNull(),
	completionTokens: int("completion_tokens").notNull(),
	totalTokens: int("total_tokens").notNull(),
	promptCost: decimal("prompt_cost", { precision: 18, scale: 12 }),
	completionCost: decimal("completion_cost", { precision: 18, scale: 12 }),
	totalCost: decimal("total_cost", { precision: 18, scale: 12 }),
	requestDurationMs: int("request_duration_ms"),
	status: varchar({ length: 20 }),
	errorMessage: text("error_message"),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => {
	return {
		createdAtIdx: index("ai_usage_created_at_idx").on(table.createdAt),
		modelIdIdx: index("ai_usage_model_id_idx").on(table.modelId),
		pluginCreatedAtIdx: index("ai_usage_plugin_created_at_idx").on(table.pluginId, table.createdAt),
		pluginIdIdx: index("ai_usage_plugin_id_idx").on(table.pluginId),
		tenantIdIdx: index("ai_usage_tenant_id_idx").on(table.tenantId),
		userIdIdx: index("ai_usage_user_id_idx").on(table.userId),
		aiUsageId: primaryKey({ columns: [table.id], name: "ai_usage_id"}),
	}
});

export const apiKeys = mysqlTable("api_keys", {
	id: varchar({ length: 128 }).notNull(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	keyHash: varchar("key_hash", { length: 64 }).notNull(),
	permissions: json().default([]).notNull(),
	rateLimit: int("rate_limit").default(1000).notNull(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => {
	return {
		expiresAtIdx: index("api_keys_expires_at_idx").on(table.expiresAt),
		keyHashIdx: index("api_keys_key_hash_idx").on(table.keyHash),
		userIdx: index("api_keys_user_idx").on(table.userId),
		apiKeysId: primaryKey({ columns: [table.id], name: "api_keys_id"}),
		apiKeysKeyHashUnique: unique("api_keys_key_hash_unique").on(table.keyHash),
	}
});

export const automationExecutions = mysqlTable("automation_executions", {
	id: varchar({ length: 128 }).notNull(),
	automationId: varchar("automation_id", { length: 128 }).notNull(),
	pluginId: varchar("plugin_id", { length: 128 }).default('workscript').notNull(),
	workflowExecutionId: varchar("workflow_execution_id", { length: 128 }),
	status: mysqlEnum(['pending','running','completed','failed']).default('pending').notNull(),
	triggerData: json("trigger_data"),
	result: json(),
	error: text(),
	startedAt: timestamp("started_at", { mode: 'string' }).default(sql`(now())`).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	duration: int(),
	triggerSource: varchar("trigger_source", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
	initialState: json("initial_state"),
	finalState: json("final_state"),
},
(table) => {
	return {
		automationIdx: index("automation_executions_automation_idx").on(table.automationId),
		createdAtIdx: index("automation_executions_created_at_idx").on(table.createdAt),
		pluginIdx: index("automation_executions_plugin_idx").on(table.pluginId),
		statusIdx: index("automation_executions_status_idx").on(table.status),
		automationExecutionsId: primaryKey({ columns: [table.id], name: "automation_executions_id"}),
	}
});

export const automations = mysqlTable("automations", {
	id: varchar({ length: 128 }).notNull(),
	pluginId: varchar("plugin_id", { length: 128 }).default('workscript').notNull(),
	agencyId: varchar("agency_id", { length: 128 }),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	triggerType: mysqlEnum("trigger_type", ['immediate','cron','webhook']).notNull(),
	triggerConfig: json("trigger_config").notNull(),
	workflowId: varchar("workflow_id", { length: 128 }).notNull(),
	enabled: tinyint().default(1).notNull(),
	lastRunAt: timestamp("last_run_at", { mode: 'string' }),
	nextRunAt: timestamp("next_run_at", { mode: 'string' }),
	runCount: int("run_count").default(0).notNull(),
	successCount: int("success_count").default(0).notNull(),
	failureCount: int("failure_count").default(0).notNull(),
	lastError: text("last_error"),
	lastErrorAt: timestamp("last_error_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
	meta: text(),
},
(table) => {
	return {
		agencyIdx: index("automations_agency_idx").on(table.agencyId),
		enabledIdx: index("automations_enabled_idx").on(table.enabled),
		nameIdx: index("automations_name_idx").on(table.name),
		nextRunIdx: index("automations_next_run_idx").on(table.nextRunAt),
		pluginAgencyIdx: index("automations_plugin_agency_idx").on(table.pluginId, table.agencyId),
		pluginIdx: index("automations_plugin_idx").on(table.pluginId),
		triggerTypeIdx: index("automations_trigger_type_idx").on(table.triggerType),
		workflowIdx: index("automations_workflow_idx").on(table.workflowId),
		automationsId: primaryKey({ columns: [table.id], name: "automations_id"}),
	}
});

export const loginAttempts = mysqlTable("login_attempts", {
	id: varchar({ length: 128 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }).notNull(),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => {
	return {
		createdAtIdx: index("login_attempts_created_at_idx").on(table.createdAt),
		emailIdx: index("login_attempts_email_idx").on(table.email),
		ipAddressIdx: index("login_attempts_ip_address_idx").on(table.ipAddress),
		loginAttemptsId: primaryKey({ columns: [table.id], name: "login_attempts_id"}),
	}
});

export const oauthConnections = mysqlTable("oauth_connections", {
	id: varchar({ length: 128 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	provider: varchar({ length: 50 }).notNull(),
	createdBy: varchar("created_by", { length: 128 }),
	tenantId: varchar("tenant_id", { length: 128 }),
	accountId: varchar("account_id", { length: 255 }),
	accountEmail: varchar("account_email", { length: 255 }),
	accountName: varchar("account_name", { length: 255 }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenEncrypted: text("access_token_encrypted"),
	refreshTokenEncrypted: text("refresh_token_encrypted"),
	encryptionVersion: int("encryption_version"),
	tokenType: varchar("token_type", { length: 50 }).default('Bearer'),
	scope: text(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	isActive: tinyint("is_active").default(1).notNull(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	lastRefreshedAt: timestamp("last_refreshed_at", { mode: 'string' }),
	lastError: text("last_error"),
	lastErrorAt: timestamp("last_error_at", { mode: 'string' }),
	providerData: json("provider_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => {
	return {
		accountEmailIdx: index("oauth_connections_account_email_idx").on(table.accountEmail),
		createdByIdx: index("oauth_connections_created_by_idx").on(table.createdBy),
		isActiveIdx: index("oauth_connections_is_active_idx").on(table.isActive),
		providerIdx: index("oauth_connections_provider_idx").on(table.provider),
		tenantIdx: index("oauth_connections_tenant_idx").on(table.tenantId),
		oauthConnectionsId: primaryKey({ columns: [table.id], name: "oauth_connections_id"}),
		oauthConnectionsProviderAccountTenantUnique: unique("oauth_connections_provider_account_tenant_unique").on(table.provider, table.accountId, table.tenantId),
	}
});

export const oauthStates = mysqlTable("oauth_states", {
	id: varchar({ length: 128 }).notNull(),
	state: varchar({ length: 128 }).notNull(),
	provider: varchar({ length: 50 }).notNull(),
	codeVerifier: text("code_verifier"),
	redirectUrl: varchar("redirect_url", { length: 500 }),
	metadata: json(),
	createdBy: varchar("created_by", { length: 128 }),
	tenantId: varchar("tenant_id", { length: 128 }),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => {
	return {
		expiresAtIdx: index("oauth_states_expires_at_idx").on(table.expiresAt),
		providerIdx: index("oauth_states_provider_idx").on(table.provider),
		stateIdx: index("oauth_states_state_idx").on(table.state),
		oauthStatesId: primaryKey({ columns: [table.id], name: "oauth_states_id"}),
	}
});

export const passwordResets = mysqlTable("password_resets", {
	id: varchar({ length: 128 }).notNull(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	token: varchar({ length: 256 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
},
(table) => {
	return {
		expiresAtIdx: index("password_resets_expires_at_idx").on(table.expiresAt),
		userIdx: index("password_resets_user_idx").on(table.userId),
		passwordResetsId: primaryKey({ columns: [table.id], name: "password_resets_id"}),
		passwordResetsTokenUnique: unique("password_resets_token_unique").on(table.token),
	}
});

export const refreshTokens = mysqlTable("refresh_tokens", {
	id: varchar({ length: 128 }).notNull(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	token: varchar({ length: 512 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => {
	return {
		expiresAtIdx: index("refresh_tokens_expires_at_idx").on(table.expiresAt),
		userIdx: index("refresh_tokens_user_idx").on(table.userId),
		refreshTokensId: primaryKey({ columns: [table.id], name: "refresh_tokens_id"}),
		refreshTokensTokenUnique: unique("refresh_tokens_token_unique").on(table.token),
	}
});

export const resourceOperations = mysqlTable("resource_operations", {
	id: varchar({ length: 128 }).notNull(),
	resourceId: varchar("resource_id", { length: 128 }).notNull(),
	operation: varchar({ length: 50 }).notNull(),
	actorType: varchar("actor_type", { length: 50 }).notNull(),
	actorId: varchar("actor_id", { length: 128 }),
	workflowId: varchar("workflow_id", { length: 128 }),
	executionId: varchar("execution_id", { length: 128 }),
	nodeId: varchar("node_id", { length: 128 }),
	details: json(),
	previousChecksum: varchar("previous_checksum", { length: 64 }),
	newChecksum: varchar("new_checksum", { length: 64 }),
	status: varchar({ length: 50 }).notNull(),
	errorMessage: text("error_message"),
	durationMs: int("duration_ms"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => {
	return {
		resourceOpsActorIdx: index("resource_ops_actor_idx").on(table.actorType, table.actorId),
		resourceOpsCreatedAtIdx: index("resource_ops_created_at_idx").on(table.createdAt),
		resourceOpsResourceIdx: index("resource_ops_resource_idx").on(table.resourceId),
		resourceOpsWorkflowIdx: index("resource_ops_workflow_idx").on(table.workflowId),
		resourceOperationsId: primaryKey({ columns: [table.id], name: "resource_operations_id"}),
	}
});

export const resources = mysqlTable("resources", {
	id: varchar({ length: 128 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	path: varchar({ length: 512 }).notNull(),
	type: varchar({ length: 50 }).notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	size: int().notNull(),
	checksum: varchar({ length: 64 }),
	authorType: varchar("author_type", { length: 50 }).notNull(),
	authorId: varchar("author_id", { length: 128 }),
	tenantId: varchar("tenant_id", { length: 128 }),
	pluginId: varchar("plugin_id", { length: 128 }).default('workscript').notNull(),
	description: text(),
	tags: json().default([]),
	metadata: json(),
	isActive: tinyint("is_active").default(1).notNull(),
	isPublic: tinyint("is_public").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
},
(table) => {
	return {
		authorIdx: index("resources_author_idx").on(table.authorType, table.authorId),
		pathIdx: index("resources_path_idx").on(table.path),
		pluginIdx: index("resources_plugin_idx").on(table.pluginId),
		tenantTypeIdx: index("resources_tenant_type_idx").on(table.tenantId, table.type),
		resourcesId: primaryKey({ columns: [table.id], name: "resources_id"}),
	}
});

export const sessions = mysqlTable("sessions", {
	id: varchar({ length: 128 }).notNull(),
	userId: varchar("user_id", { length: 128 }).notNull(),
	data: json().default({}).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => {
	return {
		expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
		userIdx: index("sessions_user_idx").on(table.userId),
		sessionsId: primaryKey({ columns: [table.id], name: "sessions_id"}),
	}
});

export const users = mysqlTable("users", {
	id: varchar({ length: 128 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }),
	role: varchar({ length: 50 }).default('user').notNull(),
	permissions: json().default([]).notNull(),
	tenantId: varchar("tenant_id", { length: 128 }),
	emailVerified: tinyint("email_verified").default(0).notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
	firstName: varchar("first_name", { length: 255 }),
	emailVerificationToken: varchar("email_verification_token", { length: 64 }),
	emailVerificationTokenExpiry: timestamp("email_verification_token_expiry", { mode: 'string' }),
},
(table) => {
	return {
		createdAtIdx: index("users_created_at_idx").on(table.createdAt),
		emailIdx: index("users_email_idx").on(table.email),
		isActiveIdx: index("users_is_active_idx").on(table.isActive),
		tenantIdx: index("users_tenant_idx").on(table.tenantId),
		usersId: primaryKey({ columns: [table.id], name: "users_id"}),
		usersEmailUnique: unique("users_email_unique").on(table.email),
	}
});

export const workflowExecutions = mysqlTable("workflow_executions", {
	id: varchar({ length: 128 }).notNull(),
	workflowId: varchar("workflow_id", { length: 128 }).notNull(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	result: json(),
	error: text(),
	startedAt: timestamp("started_at", { mode: 'string' }).default(sql`(now())`).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	triggeredBy: varchar("triggered_by", { length: 50 }).default('manual').notNull(),
	initialState: json("initial_state"),
	finalState: json("final_state"),
	stackTrace: text("stack_trace"),
	failedNodeId: varchar("failed_node_id", { length: 128 }),
	nodeLogs: json("node_logs"),
},
(table) => {
	return {
		workflowExecutionsId: primaryKey({ columns: [table.id], name: "workflow_executions_id"}),
	}
});

export const workflows = mysqlTable("workflows", {
	id: varchar({ length: 128 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	definition: json().notNull(),
	version: varchar({ length: 50 }).default('1.0.0').notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => {
	return {
		workflowsId: primaryKey({ columns: [table.id], name: "workflows_id"}),
	}
});
