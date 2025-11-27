# Implementation Plan: OAuth Integrations System (Gmail)

This document provides a concrete, actionable implementation plan for the OAuth Integrations System with Google/Gmail as the initial provider. Tasks are organized by phases and include checkboxes for tracking progress.

---

## PHASE 1: DATABASE FOUNDATION

### 1.1 Create Database Schema

- [x] **Task 1.1.1: Create integrations schema file**
  - Create `/apps/api/src/db/schema/integrations.schema.ts`
  - Import required Drizzle types: `mysqlTable`, `varchar`, `text`, `timestamp`, `json`, `boolean`, `int`, `index`, `unique`
  - Import `createId` from `@paralleldrive/cuid2`
  - _Requirements: 1, 2_

- [x] **Task 1.1.2: Define oauth_connections table**
  - Add all columns as specified in requirements:
    - `id` - VARCHAR(128) PK with CUID2 default
    - `name` - VARCHAR(255) NOT NULL
    - `provider` - VARCHAR(50) NOT NULL
    - `created_by` - VARCHAR(128) nullable
    - `tenant_id` - VARCHAR(128) nullable
    - `account_id` - VARCHAR(255) nullable
    - `account_email` - VARCHAR(255) nullable
    - `account_name` - VARCHAR(255) nullable
    - `access_token` - TEXT nullable
    - `refresh_token` - TEXT nullable
    - `access_token_encrypted` - TEXT nullable
    - `refresh_token_encrypted` - TEXT nullable
    - `encryption_version` - INT nullable
    - `token_type` - VARCHAR(50) default 'Bearer'
    - `scope` - TEXT nullable
    - `expires_at` - TIMESTAMP nullable
    - `is_active` - BOOLEAN default true NOT NULL
    - `last_used_at` - TIMESTAMP nullable
    - `last_refreshed_at` - TIMESTAMP nullable
    - `last_error` - TEXT nullable
    - `last_error_at` - TIMESTAMP nullable
    - `provider_data` - JSON nullable
    - `created_at` - TIMESTAMP default NOW() NOT NULL
    - `updated_at` - TIMESTAMP default NOW() on update NOW() NOT NULL
  - _Requirements: 1_

- [x] **Task 1.1.3: Add indexes for oauth_connections**
  - Add index on `provider` column
  - Add index on `created_by` column
  - Add index on `tenant_id` column
  - Add index on `account_email` column
  - Add index on `is_active` column
  - Add unique constraint on (`provider`, `account_id`, `tenant_id`)
  - _Requirements: 1_

- [x] **Task 1.1.4: Define oauth_states table**
  - Add all columns:
    - `id` - VARCHAR(128) PK with CUID2 default
    - `state` - VARCHAR(128) NOT NULL
    - `provider` - VARCHAR(50) NOT NULL
    - `code_verifier` - TEXT nullable
    - `redirect_url` - VARCHAR(500) nullable
    - `metadata` - JSON nullable
    - `created_by` - VARCHAR(128) nullable
    - `tenant_id` - VARCHAR(128) nullable
    - `expires_at` - TIMESTAMP NOT NULL
    - `created_at` - TIMESTAMP default NOW() NOT NULL
  - Add indexes on `state` and `expires_at` columns
  - _Requirements: 2_

- [x] **Task 1.1.5: Export TypeScript types**
  - Export `OAuthConnection` type using `$inferSelect`
  - Export `NewOAuthConnection` type using `$inferInsert`
  - Export `OAuthState` type using `$inferSelect`
  - Export `NewOAuthState` type using `$inferInsert`
  - _Requirements: 1, 2_

### 1.2 Register Schema and Run Migrations

- [x] **Task 1.2.1: Export schema in schema index**
  - Updated `/apps/api/src/db/index.ts` (project uses db/index.ts instead of separate schema/index.ts)
  - Added import and export for `integrations.schema.ts`
  - All table exports are now available
  - _Requirements: 1, 2_

- [x] **Task 1.2.2: Generate database migrations**
  - Run `cd apps/api && bun run db:generate`
  - Verify migration file is created in migrations folder
  - Review generated SQL for accuracy
  - _Requirements: 1, 2_

- [x] **Task 1.2.3: Push schema to database**
  - Run `cd apps/api && bun run db:push`
  - Verify tables are created in MySQL
  - Optionally run `bun run db:studio` to inspect tables
  - _Requirements: 1, 2_

---

## PHASE 2: TYPE DEFINITIONS

### 2.1 Create Provider Types

- [x] **Task 2.1.1: Create types directory structure**
  - Create `/apps/api/src/shared-services/integrations/` directory
  - Create `/apps/api/src/shared-services/integrations/providers/` directory
  - _Requirements: 3_

- [x] **Task 2.1.2: Create types.ts file**
  - Create `/apps/api/src/shared-services/integrations/providers/types.ts`
  - Add comprehensive JSDoc documentation for all types
  - _Requirements: 3_

- [x] **Task 2.1.3: Define OAuthProviderConfig interface**
  ```typescript
  export interface OAuthProviderConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  }
  ```
  - _Requirements: 3_

- [x] **Task 2.1.4: Define OAuthTokens interface**
  ```typescript
  export interface OAuthTokens {
    accessToken: string;
    refreshToken?: string;
    tokenType: string;
    expiresIn?: number;
    expiresAt?: Date;
    scope?: string;
    raw?: Record<string, any>;
  }
  ```
  - _Requirements: 3_

- [x] **Task 2.1.5: Define OAuthUserProfile interface**
  ```typescript
  export interface OAuthUserProfile {
    id: string;
    email?: string;
    name?: string;
    picture?: string;
    raw?: Record<string, any>;
  }
  ```
  - _Requirements: 3_

- [x] **Task 2.1.6: Define AuthUrlOptions interface**
  ```typescript
  export interface AuthUrlOptions {
    scopes?: string[];
    state?: string;
    usePKCE?: boolean;
    prompt?: 'consent' | 'select_account' | 'none';
    loginHint?: string;
    accessType?: 'online' | 'offline';
  }
  ```
  - _Requirements: 3_

- [x] **Task 2.1.7: Define AuthUrlResult interface**
  ```typescript
  export interface AuthUrlResult {
    url: string;
    state: string;
    codeVerifier?: string;
  }
  ```
  - _Requirements: 3_

- [x] **Task 2.1.8: Define OAuthProvider interface**
  ```typescript
  export interface OAuthProvider {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly defaultScopes: string[];
    readonly supportsPKCE: boolean;
    readonly supportsRefresh: boolean;

    getAuthorizationUrl(options?: AuthUrlOptions): AuthUrlResult;
    exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens>;
    refreshToken(refreshToken: string): Promise<OAuthTokens>;
    getUserProfile(accessToken: string): Promise<OAuthUserProfile>;
    revokeToken?(accessToken: string): Promise<void>;
    validateToken?(accessToken: string): Promise<boolean>;
  }
  ```
  - _Requirements: 3_

- [x] **Task 2.1.9: Define ConnectionSummary interface**
  ```typescript
  export interface ConnectionSummary {
    id: string;
    name: string;
    provider: string;
    accountEmail?: string;
    accountName?: string;
    isActive: boolean;
    expiresAt?: Date | null;
    lastUsedAt?: Date | null;
    createdAt: Date;
  }
  ```
  - _Requirements: 3, 8_

- [x] **Task 2.1.10: Define DecryptedConnection interface**
  ```typescript
  export interface DecryptedConnection {
    id: string;
    name: string;
    provider: string;
    accountId?: string | null;
    accountEmail?: string | null;
    accountName?: string | null;
    accessToken: string;
    refreshToken?: string | null;
    tokenType: string;
    scope?: string | null;
    expiresAt?: Date | null;
    isActive: boolean;
    providerData?: Record<string, any> | null;
  }
  ```
  - _Requirements: 3, 8_

- [x] **Task 2.1.11: Define error types**
  ```typescript
  export class IntegrationError extends Error {
    constructor(
      message: string,
      public code: string,
      public provider?: string,
      public details?: Record<string, any>
    ) {
      super(message);
      this.name = 'IntegrationError';
    }
  }

  export const ErrorCodes = {
    PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
    CONNECTION_NOT_FOUND: 'CONNECTION_NOT_FOUND',
    INVALID_STATE: 'INVALID_STATE',
    STATE_EXPIRED: 'STATE_EXPIRED',
    TOKEN_EXCHANGE_FAILED: 'TOKEN_EXCHANGE_FAILED',
    REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
    INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  } as const;
  ```
  - _Requirements: 18_

---

## PHASE 3: PROVIDER SYSTEM

### 3.1 Create Base Provider Class

- [x] **Task 3.1.1: Create base.ts file**
  - Create `/apps/api/src/shared-services/integrations/providers/base.ts`
  - Import types from `./types`
  - _Requirements: 3_

- [x] **Task 3.1.2: Implement OAuthProviderBase abstract class**
  - Define abstract class with common implementation
  - Add protected config property for OAuthProviderConfig
  - Implement constructor that accepts config
  - Add abstract properties: id, name, version, defaultScopes, supportsPKCE, supportsRefresh
  - Add abstract methods from OAuthProvider interface
  - _Requirements: 3_

- [x] **Task 3.1.3: Add PKCE generation helper**
  - Add protected method `generatePKCE(): { codeVerifier: string; codeChallenge: string }`
  - Use crypto.randomBytes for code_verifier (32 bytes, base64url encoded)
  - Generate code_challenge using SHA256 hash of verifier (base64url encoded)
  - _Requirements: 3, 5_

- [x] **Task 3.1.4: Add state generation helper**
  - Add protected method `generateState(): string`
  - Use crypto.randomBytes (32 bytes, base64url encoded)
  - _Requirements: 3_

### 3.2 Create Provider Registry

- [x] **Task 3.2.1: Create registry.ts file**
  - Create `/apps/api/src/shared-services/integrations/providers/registry.ts`
  - Import OAuthProvider type
  - _Requirements: 4_

- [x] **Task 3.2.2: Implement ProviderRegistry singleton**
  ```typescript
  export class ProviderRegistry {
    private static instance: ProviderRegistry;
    private providers: Map<string, OAuthProvider> = new Map();

    private constructor() {}

    static getInstance(): ProviderRegistry {
      if (!ProviderRegistry.instance) {
        ProviderRegistry.instance = new ProviderRegistry();
      }
      return ProviderRegistry.instance;
    }

    register(provider: OAuthProvider): void {
      this.providers.set(provider.id, provider);
    }

    get(providerId: string): OAuthProvider | undefined {
      return this.providers.get(providerId);
    }

    has(providerId: string): boolean {
      return this.providers.has(providerId);
    }

    getAll(): OAuthProvider[] {
      return Array.from(this.providers.values());
    }
  }
  ```
  - _Requirements: 4_

### 3.3 Implement Google Provider

- [x] **Task 3.3.1: Create google provider directory**
  - Create `/apps/api/src/shared-services/integrations/providers/google/` directory
  - _Requirements: 5_

- [x] **Task 3.3.2: Create google/index.ts file**
  - Create `/apps/api/src/shared-services/integrations/providers/google/index.ts`
  - Import googleapis OAuth2 client
  - Import base class and types
  - _Requirements: 5_

- [x] **Task 3.3.3: Define Google scopes constant**
  ```typescript
  export const GOOGLE_SCOPES = {
    GMAIL_READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
    GMAIL_SEND: 'https://www.googleapis.com/auth/gmail.send',
    GMAIL_COMPOSE: 'https://www.googleapis.com/auth/gmail.compose',
    USERINFO_EMAIL: 'https://www.googleapis.com/auth/userinfo.email',
    USERINFO_PROFILE: 'https://www.googleapis.com/auth/userinfo.profile',
    DRIVE: 'https://www.googleapis.com/auth/drive',
    DRIVE_FILE: 'https://www.googleapis.com/auth/drive.file',
  } as const;
  ```
  - _Requirements: 5_

- [x] **Task 3.3.4: Implement GoogleProvider class**
  - Extend OAuthProviderBase
  - Set id = 'google', name = 'Google', version = '1.0.0'
  - Set defaultScopes with gmail.readonly, gmail.send, userinfo.email, userinfo.profile
  - Set supportsPKCE = true, supportsRefresh = true
  - Initialize googleapis OAuth2Client in constructor
  - _Requirements: 5_

- [x] **Task 3.3.5: Implement getAuthorizationUrl method**
  - Create options object with access_type, scope, prompt
  - If usePKCE, generate and include code_challenge
  - Generate state token
  - Use oauth2Client.generateAuthUrl()
  - Return AuthUrlResult with url, state, codeVerifier
  - _Requirements: 5, 9_

- [x] **Task 3.3.6: Implement exchangeCode method**
  - Call oauth2Client.getToken(code) or with code_verifier for PKCE
  - Extract access_token, refresh_token, expiry_date, token_type, scope
  - Convert expiry_date to expiresAt Date
  - Calculate expiresIn from expiry_date
  - Return normalized OAuthTokens
  - _Requirements: 5, 10_

- [x] **Task 3.3.7: Implement refreshToken method**
  - Set credentials with refresh_token
  - Call oauth2Client.refreshAccessToken()
  - Preserve original refresh_token if not returned
  - Return normalized OAuthTokens
  - _Requirements: 5, 7_

- [x] **Task 3.3.8: Implement getUserProfile method**
  - Set credentials with access_token
  - Initialize gmail API client
  - Call gmail.users.getProfile({ userId: 'me' })
  - Return normalized OAuthUserProfile with id=emailAddress, email=emailAddress
  - _Requirements: 5_

- [x] **Task 3.3.9: Create provider factory function**
  ```typescript
  export function createGoogleProvider(): GoogleProvider | null {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn('Google OAuth credentials not configured');
      return null;
    }

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3013';
    const redirectUri = `${baseUrl}/integrations/oauth/google/callback`;

    return new GoogleProvider({
      clientId,
      clientSecret,
      redirectUri,
      scopes: [
        GOOGLE_SCOPES.GMAIL_READONLY,
        GOOGLE_SCOPES.GMAIL_SEND,
        GOOGLE_SCOPES.USERINFO_EMAIL,
        GOOGLE_SCOPES.USERINFO_PROFILE,
      ],
    });
  }
  ```
  - _Requirements: 5, 17_

### 3.4 Create Provider Exports

- [x] **Task 3.4.1: Create providers/index.ts**
  - Create `/apps/api/src/shared-services/integrations/providers/index.ts`
  - Export all types from `./types`
  - Export OAuthProviderBase from `./base`
  - Export ProviderRegistry from `./registry`
  - Export GoogleProvider and createGoogleProvider from `./google`
  - _Requirements: 3, 4, 5_

- [x] **Task 3.4.2: Create provider initialization function**
  ```typescript
  export function initializeProviders(): void {
    const registry = ProviderRegistry.getInstance();

    const googleProvider = createGoogleProvider();
    if (googleProvider) {
      registry.register(googleProvider);
      console.log('Registered Google OAuth provider');
    }

    // Future providers will be registered here
  }
  ```
  - _Requirements: 4, 5_

---

## PHASE 4: DATA LAYER

### 4.1 Create Connection Repository

- [x] **Task 4.1.1: Create repositories directory**
  - Create `/apps/api/src/shared-services/integrations/repositories/` directory
  - _Requirements: 6_

- [x] **Task 4.1.2: Create connectionRepository.ts**
  - Create `/apps/api/src/shared-services/integrations/repositories/connectionRepository.ts`
  - Import db from `/apps/api/src/db`
  - Import schema tables
  - Import drizzle query builder functions (eq, and, lt)
  - _Requirements: 6_

- [x] **Task 4.1.3: Implement create method**
  ```typescript
  async create(data: NewOAuthConnection): Promise<OAuthConnection> {
    const [result] = await db.insert(oauthConnections).values(data);
    return this.findById(data.id!)!;
  }
  ```
  - _Requirements: 6_

- [x] **Task 4.1.4: Implement findById method**
  ```typescript
  async findById(id: string): Promise<OAuthConnection | null> {
    const [result] = await db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.id, id))
      .limit(1);
    return result || null;
  }
  ```
  - _Requirements: 6_

- [x] **Task 4.1.5: Implement findByProvider method**
  ```typescript
  async findByProvider(
    provider: string,
    filters?: { createdBy?: string; tenantId?: string }
  ): Promise<OAuthConnection[]> {
    const conditions = [eq(oauthConnections.provider, provider)];
    if (filters?.createdBy) {
      conditions.push(eq(oauthConnections.createdBy, filters.createdBy));
    }
    if (filters?.tenantId) {
      conditions.push(eq(oauthConnections.tenantId, filters.tenantId));
    }
    return db
      .select()
      .from(oauthConnections)
      .where(and(...conditions));
  }
  ```
  - _Requirements: 6_

- [x] **Task 4.1.6: Implement findByAccountEmail method**
  ```typescript
  async findByAccountEmail(
    email: string,
    provider?: string
  ): Promise<OAuthConnection[]> {
    const conditions = [eq(oauthConnections.accountEmail, email)];
    if (provider) {
      conditions.push(eq(oauthConnections.provider, provider));
    }
    return db
      .select()
      .from(oauthConnections)
      .where(and(...conditions));
  }
  ```
  - _Requirements: 6_

- [x] **Task 4.1.7: Implement findAll method**
  ```typescript
  async findAll(filters?: {
    provider?: string;
    createdBy?: string;
    isActive?: boolean;
  }): Promise<OAuthConnection[]> {
    const conditions = [];
    if (filters?.provider) {
      conditions.push(eq(oauthConnections.provider, filters.provider));
    }
    if (filters?.createdBy) {
      conditions.push(eq(oauthConnections.createdBy, filters.createdBy));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(oauthConnections.isActive, filters.isActive));
    }
    if (conditions.length === 0) {
      return db.select().from(oauthConnections);
    }
    return db
      .select()
      .from(oauthConnections)
      .where(and(...conditions));
  }
  ```
  - _Requirements: 6_

- [x] **Task 4.1.8: Implement update method**
  ```typescript
  async update(
    id: string,
    updates: Partial<NewOAuthConnection>
  ): Promise<OAuthConnection | null> {
    await db
      .update(oauthConnections)
      .set(updates)
      .where(eq(oauthConnections.id, id));
    return this.findById(id);
  }
  ```
  - _Requirements: 6_

- [x] **Task 4.1.9: Implement delete method**
  ```typescript
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(oauthConnections)
      .where(eq(oauthConnections.id, id));
    return result.rowsAffected > 0;
  }
  ```
  - _Requirements: 6_

- [x] **Task 4.1.10: Implement updateLastUsed method**
  ```typescript
  async updateLastUsed(id: string): Promise<void> {
    await db
      .update(oauthConnections)
      .set({ lastUsedAt: new Date() })
      .where(eq(oauthConnections.id, id));
  }
  ```
  - _Requirements: 6_

- [x] **Task 4.1.11: Implement updateError method**
  ```typescript
  async updateError(id: string, error: string): Promise<void> {
    await db
      .update(oauthConnections)
      .set({
        lastError: error,
        lastErrorAt: new Date(),
        isActive: false,
      })
      .where(eq(oauthConnections.id, id));
  }
  ```
  - _Requirements: 6_

- [x] **Task 4.1.12: Implement state management methods**
  ```typescript
  async createState(data: NewOAuthState): Promise<OAuthState> {
    await db.insert(oauthStates).values(data);
    return this.findState(data.state)!;
  }

  async findState(state: string): Promise<OAuthState | null> {
    const [result] = await db
      .select()
      .from(oauthStates)
      .where(eq(oauthStates.state, state))
      .limit(1);
    return result || null;
  }

  async deleteState(state: string): Promise<void> {
    await db
      .delete(oauthStates)
      .where(eq(oauthStates.state, state));
  }

  async cleanupExpiredStates(): Promise<number> {
    const result = await db
      .delete(oauthStates)
      .where(lt(oauthStates.expiresAt, new Date()));
    return result.rowsAffected;
  }
  ```
  - _Requirements: 6_

- [x] **Task 4.1.13: Export ConnectionRepository class**
  - Export class and singleton instance getter
  - _Requirements: 6_

---

## PHASE 5: SERVICE LAYER

### 5.1 Create Token Manager

- [x] **Task 5.1.1: Create TokenManager.ts**
  - Create `/apps/api/src/shared-services/integrations/TokenManager.ts`
  - Import repository and provider registry
  - Import types
  - _Requirements: 7_

- [x] **Task 5.1.2: Implement TokenManager singleton**
  ```typescript
  export class TokenManager {
    private static instance: TokenManager;
    private repository: ConnectionRepository;
    private registry: ProviderRegistry;

    private constructor() {
      this.repository = ConnectionRepository.getInstance();
      this.registry = ProviderRegistry.getInstance();
    }

    static getInstance(): TokenManager {
      if (!TokenManager.instance) {
        TokenManager.instance = new TokenManager();
      }
      return TokenManager.instance;
    }
  }
  ```
  - _Requirements: 7_

- [x] **Task 5.1.3: Implement isTokenExpired helper**
  ```typescript
  private isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return true;
    // 60-second buffer before actual expiry
    const bufferMs = 60 * 1000;
    return new Date().getTime() >= expiresAt.getTime() - bufferMs;
  }
  ```
  - _Requirements: 7_

- [x] **Task 5.1.4: Implement ensureValidToken method**
  ```typescript
  async ensureValidToken(connection: OAuthConnection): Promise<string> {
    // Check if token is still valid
    if (!this.isTokenExpired(connection.expiresAt)) {
      await this.repository.updateLastUsed(connection.id);
      return connection.accessToken!;
    }

    // Token expired, need to refresh
    if (!connection.refreshToken) {
      throw new IntegrationError(
        'No refresh token available',
        ErrorCodes.REFRESH_TOKEN_EXPIRED,
        connection.provider
      );
    }

    // Refresh the token
    const newTokens = await this.refreshToken(connection.id);
    return newTokens.accessToken;
  }
  ```
  - _Requirements: 7_

- [x] **Task 5.1.5: Implement refreshToken method**
  ```typescript
  async refreshToken(connectionId: string): Promise<OAuthTokens> {
    const connection = await this.repository.findById(connectionId);
    if (!connection) {
      throw new IntegrationError(
        'Connection not found',
        ErrorCodes.CONNECTION_NOT_FOUND
      );
    }

    const provider = this.registry.get(connection.provider);
    if (!provider) {
      throw new IntegrationError(
        'Provider not found',
        ErrorCodes.PROVIDER_NOT_FOUND,
        connection.provider
      );
    }

    try {
      const newTokens = await provider.refreshToken(connection.refreshToken!);

      // Google doesn't return refresh_token on refresh, preserve original
      const refreshToken = newTokens.refreshToken || connection.refreshToken;

      await this.repository.update(connectionId, {
        accessToken: newTokens.accessToken,
        refreshToken: refreshToken,
        expiresAt: newTokens.expiresAt,
        scope: newTokens.scope || connection.scope,
        lastRefreshedAt: new Date(),
        isActive: true,
        lastError: null,
      });

      return newTokens;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check for invalid_grant (refresh token expired/revoked)
      if (errorMessage.includes('invalid_grant')) {
        await this.repository.updateError(
          connectionId,
          'Refresh token expired or revoked. Re-authentication required.'
        );
        throw new IntegrationError(
          'Refresh token expired',
          ErrorCodes.REFRESH_TOKEN_EXPIRED,
          connection.provider
        );
      }

      await this.repository.updateError(connectionId, errorMessage);
      throw error;
    }
  }
  ```
  - _Requirements: 7_

### 5.2 Create Integration Manager

- [x] **Task 5.2.1: Create IntegrationManager.ts**
  - Create `/apps/api/src/shared-services/integrations/IntegrationManager.ts`
  - Import all dependencies
  - _Requirements: 8_

- [x] **Task 5.2.2: Implement IntegrationManager singleton**
  ```typescript
  export class IntegrationManager {
    private static instance: IntegrationManager;
    private repository: ConnectionRepository;
    private tokenManager: TokenManager;
    private registry: ProviderRegistry;

    private constructor() {
      this.repository = ConnectionRepository.getInstance();
      this.tokenManager = TokenManager.getInstance();
      this.registry = ProviderRegistry.getInstance();
    }

    static getInstance(): IntegrationManager {
      if (!IntegrationManager.instance) {
        IntegrationManager.instance = new IntegrationManager();
      }
      return IntegrationManager.instance;
    }
  }
  ```
  - _Requirements: 8_

- [x] **Task 5.2.3: Implement getConnections method**
  ```typescript
  async getConnections(filters?: {
    provider?: string;
    createdBy?: string;
  }): Promise<ConnectionSummary[]> {
    const connections = await this.repository.findAll(filters);
    return connections.map(this.toConnectionSummary);
  }

  private toConnectionSummary(conn: OAuthConnection): ConnectionSummary {
    return {
      id: conn.id,
      name: conn.name,
      provider: conn.provider,
      accountEmail: conn.accountEmail || undefined,
      accountName: conn.accountName || undefined,
      isActive: conn.isActive,
      expiresAt: conn.expiresAt,
      lastUsedAt: conn.lastUsedAt,
      createdAt: conn.createdAt,
    };
  }
  ```
  - _Requirements: 8_

- [x] **Task 5.2.4: Implement getConnection method**
  ```typescript
  async getConnection(id: string): Promise<OAuthConnection | null> {
    return this.repository.findById(id);
  }
  ```
  - _Requirements: 8_

- [x] **Task 5.2.5: Implement deleteConnection method**
  ```typescript
  async deleteConnection(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
  ```
  - _Requirements: 8_

- [x] **Task 5.2.6: Implement renameConnection method**
  ```typescript
  async renameConnection(id: string, name: string): Promise<OAuthConnection | null> {
    return this.repository.update(id, { name });
  }
  ```
  - _Requirements: 8_

- [x] **Task 5.2.7: Implement initiateOAuth method**
  ```typescript
  async initiateOAuth(
    providerId: string,
    options?: {
      scopes?: string[];
      userId?: string;
      tenantId?: string;
      redirectUrl?: string;
    }
  ): Promise<{ authUrl: string; state: string }> {
    const provider = this.registry.get(providerId);
    if (!provider) {
      throw new IntegrationError(
        `Provider '${providerId}' not found`,
        ErrorCodes.PROVIDER_NOT_FOUND,
        providerId
      );
    }

    const authResult = provider.getAuthorizationUrl({
      scopes: options?.scopes,
      usePKCE: provider.supportsPKCE,
      accessType: 'offline',
      prompt: 'consent',
    });

    // Store state for CSRF protection
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await this.repository.createState({
      state: authResult.state,
      provider: providerId,
      codeVerifier: authResult.codeVerifier || null,
      redirectUrl: options?.redirectUrl || null,
      metadata: {
        userId: options?.userId,
        tenantId: options?.tenantId,
      },
      createdBy: options?.userId || null,
      tenantId: options?.tenantId || null,
      expiresAt,
    });

    return {
      authUrl: authResult.url,
      state: authResult.state,
    };
  }
  ```
  - _Requirements: 8, 9_

- [x] **Task 5.2.8: Implement handleCallback method**
  ```typescript
  async handleCallback(
    providerId: string,
    code: string,
    state: string
  ): Promise<OAuthConnection> {
    // Validate state
    const storedState = await this.repository.findState(state);
    if (!storedState) {
      throw new IntegrationError(
        'Invalid or expired state',
        ErrorCodes.INVALID_STATE,
        providerId
      );
    }

    if (storedState.expiresAt < new Date()) {
      await this.repository.deleteState(state);
      throw new IntegrationError(
        'State has expired',
        ErrorCodes.STATE_EXPIRED,
        providerId
      );
    }

    const provider = this.registry.get(providerId);
    if (!provider) {
      throw new IntegrationError(
        `Provider '${providerId}' not found`,
        ErrorCodes.PROVIDER_NOT_FOUND,
        providerId
      );
    }

    try {
      // Exchange code for tokens
      const tokens = await provider.exchangeCode(
        code,
        storedState.codeVerifier || undefined
      );

      // Get user profile
      const profile = await provider.getUserProfile(tokens.accessToken);

      // Delete used state
      await this.repository.deleteState(state);

      // Get metadata from state
      const metadata = storedState.metadata as {
        userId?: string;
        tenantId?: string;
      } | null;

      // Check for existing connection
      const existingConnections = await this.repository.findByAccountEmail(
        profile.email!,
        providerId
      );

      const existingConnection = existingConnections.find(
        (c) =>
          c.accountId === profile.id &&
          c.tenantId === (metadata?.tenantId || null)
      );

      if (existingConnection) {
        // Update existing connection
        return (await this.repository.update(existingConnection.id, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || existingConnection.refreshToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
          accountName: profile.name,
          isActive: true,
          lastError: null,
          lastRefreshedAt: new Date(),
        }))!;
      }

      // Create new connection
      const connectionId = createId();
      const name = `${provider.name} - ${profile.email || profile.name || profile.id}`;

      await this.repository.create({
        id: connectionId,
        name,
        provider: providerId,
        createdBy: metadata?.userId || null,
        tenantId: metadata?.tenantId || null,
        accountId: profile.id,
        accountEmail: profile.email || null,
        accountName: profile.name || null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || null,
        tokenType: tokens.tokenType,
        scope: tokens.scope || null,
        expiresAt: tokens.expiresAt || null,
        isActive: true,
        providerData: profile.raw || null,
      });

      return (await this.repository.findById(connectionId))!;
    } catch (error) {
      throw new IntegrationError(
        'Failed to exchange authorization code',
        ErrorCodes.TOKEN_EXCHANGE_FAILED,
        providerId,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  ```
  - _Requirements: 8, 10_

- [x] **Task 5.2.9: Implement getValidToken method**
  ```typescript
  async getValidToken(connectionId: string): Promise<string> {
    const connection = await this.repository.findById(connectionId);
    if (!connection) {
      throw new IntegrationError(
        'Connection not found',
        ErrorCodes.CONNECTION_NOT_FOUND
      );
    }

    if (!connection.isActive) {
      throw new IntegrationError(
        'Connection is inactive. Re-authentication required.',
        ErrorCodes.REFRESH_TOKEN_EXPIRED,
        connection.provider
      );
    }

    return this.tokenManager.ensureValidToken(connection);
  }
  ```
  - _Requirements: 8_

- [x] **Task 5.2.10: Implement testConnection method**
  ```typescript
  async testConnection(connectionId: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      const token = await this.getValidToken(connectionId);
      const connection = await this.repository.findById(connectionId);

      if (!connection) {
        return { valid: false, error: 'Connection not found' };
      }

      const provider = this.registry.get(connection.provider);
      if (!provider) {
        return { valid: false, error: 'Provider not found' };
      }

      // Try to get user profile to verify token works
      await provider.getUserProfile(token);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  ```
  - _Requirements: 8_

### 5.3 Create Service Exports

- [x] **Task 5.3.1: Create integrations/index.ts**
  - Create `/apps/api/src/shared-services/integrations/index.ts`
  - Export IntegrationManager
  - Export TokenManager
  - Export all provider types and classes
  - Export ConnectionRepository
  - Export initializeProviders function
  - _Requirements: 8_

---

## PHASE 6: API ROUTES

### 6.1 Create Integration Routes

- [x] **Task 6.1.1: Create routes/integrations.ts**
  - Create `/apps/api/src/routes/integrations.ts`
  - Import Hono and create router
  - Import IntegrationManager and ProviderRegistry
  - _Requirements: 9, 10, 11, 12, 13_

- [x] **Task 6.1.2: Implement GET /oauth/providers route**
  ```typescript
  router.get('/oauth/providers', async (c) => {
    const registry = ProviderRegistry.getInstance();
    const providers = registry.getAll().map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      defaultScopes: p.defaultScopes,
      supportsPKCE: p.supportsPKCE,
    }));

    return c.json({
      success: true,
      count: providers.length,
      providers,
    });
  });
  ```
  - _Requirements: 12_

- [x] **Task 6.1.3: Implement GET /oauth/:provider route**
  ```typescript
  router.get('/oauth/:provider', async (c) => {
    const providerId = c.req.param('provider');
    const registry = ProviderRegistry.getInstance();
    const provider = registry.get(providerId);

    if (!provider) {
      return c.json({ success: false, error: 'Provider not found' }, 404);
    }

    return c.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        version: provider.version,
        defaultScopes: provider.defaultScopes,
        supportsPKCE: provider.supportsPKCE,
        supportsRefresh: provider.supportsRefresh,
      },
    });
  });
  ```
  - _Requirements: 12_

- [x] **Task 6.1.4: Implement GET /oauth/:provider/auth route**
  ```typescript
  router.get('/oauth/:provider/auth', async (c) => {
    const providerId = c.req.param('provider');
    // Optional query params
    const userId = c.req.query('userId');
    const tenantId = c.req.query('tenantId');
    const redirect = c.req.query('redirect');

    try {
      const manager = IntegrationManager.getInstance();
      const { authUrl, state } = await manager.initiateOAuth(providerId, {
        userId,
        tenantId,
        redirectUrl: redirect,
      });

      // Redirect to OAuth provider
      return c.redirect(authUrl);
    } catch (error) {
      if (error instanceof IntegrationError) {
        return c.json({ success: false, error: error.message, code: error.code }, 400);
      }
      throw error;
    }
  });
  ```
  - _Requirements: 9_

- [x] **Task 6.1.5: Implement GET /oauth/:provider/callback route**
  ```typescript
  router.get('/oauth/:provider/callback', async (c) => {
    const providerId = c.req.param('provider');
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');

    if (error) {
      return c.json({
        success: false,
        error: `OAuth error: ${error}`,
        description: c.req.query('error_description'),
      }, 400);
    }

    if (!code || !state) {
      return c.json({
        success: false,
        error: 'Missing code or state parameter',
      }, 400);
    }

    try {
      const manager = IntegrationManager.getInstance();
      const connection = await manager.handleCallback(providerId, code, state);

      // Return success page or JSON
      return c.json({
        success: true,
        message: 'Connection established successfully',
        connection: {
          id: connection.id,
          name: connection.name,
          provider: connection.provider,
          accountEmail: connection.accountEmail,
          accountName: connection.accountName,
        },
      });
    } catch (error) {
      if (error instanceof IntegrationError) {
        return c.json({
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        }, 400);
      }
      throw error;
    }
  });
  ```
  - _Requirements: 10_

- [x] **Task 6.1.6: Implement GET /connections route**
  ```typescript
  router.get('/connections', async (c) => {
    const provider = c.req.query('provider');
    const createdBy = c.req.query('createdBy');

    const manager = IntegrationManager.getInstance();
    const connections = await manager.getConnections({
      provider: provider || undefined,
      createdBy: createdBy || undefined,
    });

    return c.json({
      success: true,
      count: connections.length,
      connections,
    });
  });
  ```
  - _Requirements: 11_

- [x] **Task 6.1.7: Implement GET /connections/:id route**
  ```typescript
  router.get('/connections/:id', async (c) => {
    const id = c.req.param('id');
    const manager = IntegrationManager.getInstance();
    const connection = await manager.getConnection(id);

    if (!connection) {
      return c.json({ success: false, error: 'Connection not found' }, 404);
    }

    // Return without tokens
    return c.json({
      success: true,
      connection: {
        id: connection.id,
        name: connection.name,
        provider: connection.provider,
        accountEmail: connection.accountEmail,
        accountName: connection.accountName,
        isActive: connection.isActive,
        expiresAt: connection.expiresAt,
        lastUsedAt: connection.lastUsedAt,
        lastRefreshedAt: connection.lastRefreshedAt,
        lastError: connection.lastError,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      },
    });
  });
  ```
  - _Requirements: 11_

- [x] **Task 6.1.8: Implement POST /connections/:id/rename route**
  ```typescript
  router.post('/connections/:id/rename', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    const manager = IntegrationManager.getInstance();
    const connection = await manager.renameConnection(id, name);

    if (!connection) {
      return c.json({ success: false, error: 'Connection not found' }, 404);
    }

    return c.json({
      success: true,
      connection: {
        id: connection.id,
        name: connection.name,
        provider: connection.provider,
      },
    });
  });
  ```
  - _Requirements: 11_

- [x] **Task 6.1.9: Implement DELETE /connections/:id route**
  ```typescript
  router.delete('/connections/:id', async (c) => {
    const id = c.req.param('id');
    const manager = IntegrationManager.getInstance();
    const deleted = await manager.deleteConnection(id);

    if (!deleted) {
      return c.json({ success: false, error: 'Connection not found' }, 404);
    }

    return c.json({ success: true, message: 'Connection deleted' });
  });
  ```
  - _Requirements: 11_

- [x] **Task 6.1.10: Implement POST /connections/:id/test route**
  ```typescript
  router.post('/connections/:id/test', async (c) => {
    const id = c.req.param('id');
    const manager = IntegrationManager.getInstance();
    const result = await manager.testConnection(id);

    return c.json({
      success: true,
      result,
    });
  });
  ```
  - _Requirements: 11_

- [x] **Task 6.1.11: Implement GET /connections/:id/token route**
  ```typescript
  router.get('/connections/:id/token', async (c) => {
    const id = c.req.param('id');

    try {
      const manager = IntegrationManager.getInstance();
      const token = await manager.getValidToken(id);

      return c.json({
        success: true,
        token,
      });
    } catch (error) {
      if (error instanceof IntegrationError) {
        const status = error.code === ErrorCodes.CONNECTION_NOT_FOUND ? 404 : 400;
        return c.json({
          success: false,
          error: error.message,
          code: error.code,
          requiresReauth: error.code === ErrorCodes.REFRESH_TOKEN_EXPIRED,
        }, status);
      }
      throw error;
    }
  });
  ```
  - _Requirements: 11_

- [x] **Task 6.1.12: Implement POST /oauth/:provider/:id/refresh route**
  ```typescript
  router.post('/oauth/:provider/:id/refresh', async (c) => {
    const id = c.req.param('id');

    try {
      const tokenManager = TokenManager.getInstance();
      const newTokens = await tokenManager.refreshToken(id);

      return c.json({
        success: true,
        message: 'Token refreshed successfully',
        expiresAt: newTokens.expiresAt,
      });
    } catch (error) {
      if (error instanceof IntegrationError) {
        return c.json({
          success: false,
          error: error.message,
          code: error.code,
          requiresReauth: error.code === ErrorCodes.REFRESH_TOKEN_EXPIRED,
        }, 400);
      }
      throw error;
    }
  });
  ```
  - _Requirements: 13_

- [x] **Task 6.1.13: Export integrations router**
  - Export default router
  - _Requirements: 9, 10, 11, 12, 13_

### 6.2 Mount Routes in Main Application

- [x] **Task 6.2.1: Import integrations routes in index.ts**
  - Open `/apps/api/src/index.ts`
  - Import integrations router from `./routes/integrations`
  - Import initializeProviders function
  - _Requirements: 9_

- [x] **Task 6.2.2: Initialize providers at startup**
  - Call `initializeProviders()` during server initialization
  - Log provider registration status
  - _Requirements: 4, 5_

- [x] **Task 6.2.3: Mount integrations routes**
  - Mount router at `/integrations` path: `app.route('/integrations', integrationsRouter)`
  - _Requirements: 9_

---

## PHASE 7: NODE INTEGRATION

### 7.1 Update GoogleConnect Node

- [x] **Task 7.1.1: Open googleConnect.ts for editing**
  - Open `/packages/nodes/src/custom/google/gmail/googleConnect.ts`
  - Review current implementation
  - _Requirements: 14_

- [x] **Task 7.1.2: Add connectionId support to config**
  - Update metadata inputs to include 'connectionId'
  - Update ai_hints to document connectionId usage
  - _Requirements: 14_

- [x] **Task 7.1.3: Implement connectionId-based token retrieval**
  ```typescript
  // In execute method
  const connectionId = config?.connectionId;

  if (connectionId) {
    try {
      // Fetch token from integrations API
      const apiUrl = `http://localhost:3013/integrations/connections/${connectionId}/token`;
      const tokenResponse = await fetch(apiUrl);

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        return {
          error: () => ({
            message: errorData.error || 'Failed to get token',
            requiresReauth: errorData.requiresReauth || false,
          }),
        };
      }

      const { token } = await tokenResponse.json();

      // Fetch connection info
      const infoUrl = `http://localhost:3013/integrations/connections/${connectionId}`;
      const infoResponse = await fetch(infoUrl);
      const { connection } = await infoResponse.json();

      // Set state for downstream nodes
      context.state.google_token = token;
      context.state.gmail_profile = {
        emailAddress: connection.accountEmail,
      };
      context.state.current_connection_id = connectionId;

      return {
        success: () => ({
          connectionId,
          email: connection.accountEmail,
        }),
      };
    } catch (error) {
      return {
        error: () => ({
          message: error instanceof Error ? error.message : 'Failed to connect',
        }),
      };
    }
  }
  ```
  - _Requirements: 14_

- [x] **Task 7.1.4: Keep backward compatibility for email-based lookup**
  - If connectionId is not provided but email is, use legacy API call
  - Document deprecation of email-based approach
  - _Requirements: 14_

### 7.2 Update SendEmail Node

- [x] **Task 7.2.1: Open sendEmail.ts for review**
  - Open `/packages/nodes/src/custom/google/gmail/sendEmail.ts`
  - Verify it uses context.state.google_token
  - No changes needed if it already reads from state
  - _Requirements: 15_

- [x] **Task 7.2.2: Verify error handling for missing token**
  - Confirm config_error edge is returned when google_token is missing
  - _Requirements: 15_

### 7.3 Update ListEmails Node

- [x] **Task 7.3.1: Open listEmails.ts for review**
  - Open `/packages/nodes/src/custom/google/gmail/listEmails.ts`
  - Verify it uses context.state.google_token
  - No changes needed if it already reads from state
  - _Requirements: 16_

- [x] **Task 7.3.2: Verify error handling for missing token**
  - Confirm config_error edge is returned when google_token is missing
  - _Requirements: 16_

### 7.4 Build and Test Nodes

- [x] **Task 7.4.1: Rebuild nodes package**
  - Run `cd packages/nodes && bun run build`
  - Verify build succeeds without errors
  - _Requirements: 14, 15, 16_

---

## PHASE 8: CONFIGURATION

### 8.1 Environment Variables

- [ ] **Task 8.1.1: Update .env.example**
  - Open or create `/apps/api/.env.example`
  - Add GOOGLE_CLIENT_ID with description
  - Add GOOGLE_CLIENT_SECRET with description
  - Add API_BASE_URL with default value
  - _Requirements: 17_

- [ ] **Task 8.1.2: Update local .env file**
  - Add actual Google OAuth credentials to `.env` (do not commit)
  - Verify credentials are from Google Cloud Console
  - _Requirements: 17_

- [ ] **Task 8.1.3: Update Google Cloud Console**
  - Add `http://localhost:3013/integrations/oauth/google/callback` as authorized redirect URI
  - Remove old callback URL if present
  - _Requirements: 17_

---

## PHASE 9: TESTING

### 9.1 Manual Testing

- [ ] **Task 9.1.1: Start the API server**
  - Run `cd apps/api && bun run dev`
  - Verify server starts without errors
  - Verify provider registration message in logs
  - _Requirements: All_

- [ ] **Task 9.1.2: Test provider discovery**
  - Call `GET http://localhost:3013/integrations/oauth/providers`
  - Verify Google provider is listed
  - Verify response includes id, name, scopes
  - _Requirements: 12_

- [ ] **Task 9.1.3: Test OAuth initiation**
  - Call `GET http://localhost:3013/integrations/oauth/google/auth`
  - Verify redirect to Google consent screen
  - Verify state is created in database
  - _Requirements: 9_

- [ ] **Task 9.1.4: Test OAuth callback**
  - Complete Google login and consent
  - Verify callback is handled successfully
  - Verify connection is created in database
  - Verify tokens are stored
  - _Requirements: 10_

- [ ] **Task 9.1.5: Test connection listing**
  - Call `GET http://localhost:3013/integrations/connections`
  - Verify connection appears in list
  - Verify tokens are NOT exposed
  - _Requirements: 11_

- [ ] **Task 9.1.6: Test connection details**
  - Call `GET http://localhost:3013/integrations/connections/:id`
  - Verify full connection details returned
  - Verify tokens are NOT exposed
  - _Requirements: 11_

- [ ] **Task 9.1.7: Test token retrieval**
  - Call `GET http://localhost:3013/integrations/connections/:id/token`
  - Verify access token is returned
  - _Requirements: 11_

- [ ] **Task 9.1.8: Test connection test**
  - Call `POST http://localhost:3013/integrations/connections/:id/test`
  - Verify { valid: true } is returned
  - _Requirements: 11_

- [ ] **Task 9.1.9: Test token refresh**
  - Wait for token to expire or call refresh endpoint
  - Call `POST http://localhost:3013/integrations/oauth/google/:id/refresh`
  - Verify new expiration time
  - _Requirements: 13_

- [ ] **Task 9.1.10: Test connection rename**
  - Call `POST http://localhost:3013/integrations/connections/:id/rename` with new name
  - Verify name is updated
  - _Requirements: 11_

- [ ] **Task 9.1.11: Test connection deletion**
  - Create a test connection
  - Call `DELETE http://localhost:3013/integrations/connections/:id`
  - Verify connection is removed
  - _Requirements: 11_

### 9.2 Node Integration Testing

- [ ] **Task 9.2.1: Create test workflow with GoogleConnect node**
  - Create workflow JSON with googleConnect using connectionId
  - Execute workflow via API
  - Verify google_token is set in state
  - _Requirements: 14_

- [ ] **Task 9.2.2: Test SendEmail node with integration**
  - Create workflow with googleConnect followed by sendEmail
  - Execute workflow
  - Verify email is sent successfully
  - _Requirements: 15_

- [ ] **Task 9.2.3: Test ListEmails node with integration**
  - Create workflow with googleConnect followed by listEmails
  - Execute workflow
  - Verify emails are listed
  - _Requirements: 16_

### 9.3 Error Handling Testing

- [ ] **Task 9.3.1: Test invalid provider**
  - Call OAuth auth with non-existent provider
  - Verify 400 error with PROVIDER_NOT_FOUND code
  - _Requirements: 18_

- [ ] **Task 9.3.2: Test invalid state**
  - Call callback with invalid state parameter
  - Verify 400 error with INVALID_STATE code
  - _Requirements: 18_

- [ ] **Task 9.3.3: Test expired state**
  - Create state, wait 10+ minutes, then use it
  - Verify 400 error with STATE_EXPIRED code
  - _Requirements: 18_

- [ ] **Task 9.3.4: Test connection not found**
  - Call token endpoint with non-existent connection ID
  - Verify 404 error with CONNECTION_NOT_FOUND code
  - _Requirements: 18_

---

## PHASE 10: DOCUMENTATION & POLISH

### 10.1 Code Documentation

- [ ] **Task 10.1.1: Add JSDoc to all public interfaces**
  - Add comprehensive JSDoc to types.ts
  - Document parameters, return values, examples
  - _Requirements: Non-Functional_

- [ ] **Task 10.1.2: Add JSDoc to IntegrationManager methods**
  - Document each public method
  - Include usage examples
  - _Requirements: Non-Functional_

- [ ] **Task 10.1.3: Add JSDoc to route handlers**
  - Document request/response formats
  - Include example requests
  - _Requirements: Non-Functional_

### 10.2 Project Documentation

- [ ] **Task 10.2.1: Update CLAUDE.md**
  - Add integrations service to architecture overview
  - Document shared-services/integrations folder
  - Document environment variables
  - _Requirements: Non-Functional_

- [ ] **Task 10.2.2: Create integrations README**
  - Create `/apps/api/src/shared-services/integrations/README.md`
  - Document architecture, usage, adding new providers
  - _Requirements: Non-Functional_

### 10.3 Final Cleanup

- [ ] **Task 10.3.1: Run TypeScript type check**
  - Run `bun run typecheck` from root
  - Fix any type errors
  - _Requirements: Non-Functional_

- [ ] **Task 10.3.2: Run linter**
  - Run `bun run lint` if available
  - Fix any linting errors
  - _Requirements: Non-Functional_

- [ ] **Task 10.3.3: Format code**
  - Run `bun run format` from root
  - Ensure consistent formatting
  - _Requirements: Non-Functional_

- [ ] **Task 10.3.4: Test full build**
  - Run `bun run build` from root
  - Verify all packages build successfully
  - _Requirements: Non-Functional_

---

## Summary

**Total Tasks:** 98
**Estimated Time:** 3-5 days

**Critical Path:**
1. Phase 1: Database Foundation (0.5 days)
2. Phase 2: Type Definitions (0.5 days)
3. Phase 3: Provider System (1 day)
4. Phase 4: Data Layer (0.5 days)
5. Phase 5: Service Layer (0.5 days)
6. Phase 6: API Routes (0.5 days)
7. Phase 7: Node Integration (0.25 days)
8. Phase 8: Configuration (0.1 days)
9. Phase 9: Testing (0.5 days)
10. Phase 10: Documentation & Polish (0.25 days)

**Key Milestones:**
- Database schema created and migrated
- Google OAuth provider fully implemented
- All API endpoints functional
- Gmail nodes working with new integration system
- Full test coverage of OAuth flows
- Documentation complete

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-27
**Status:** Ready for Implementation
