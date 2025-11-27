# Requirements Document: OAuth Integrations System (Gmail)

## Introduction

The OAuth Integrations System is a comprehensive, multi-provider authentication service designed to enable secure connections between the Workscript workflow engine and third-party services. This system provides a unified interface for managing OAuth2 authentication flows, token storage, automatic token refresh, and connection lifecycle management.

This feature addresses the critical need for workflows to interact with external services like Gmail, Google Drive, Twitter, LinkedIn, and other OAuth-protected APIs. By implementing a centralized integration system, we enable users to create multiple named connections per provider, securely store credentials, and automatically manage token expiration—all without exposing sensitive data to workflow definitions.

The system is built as a shared service within the API server (`/apps/api/src/shared-services/integrations/`) using TypeScript, Hono.js for routing, Drizzle ORM for MySQL database operations, and the `googleapis` library for Google OAuth2 implementation. The architecture follows established patterns from existing shared services (AuthManager, SessionManager) and is designed to be extensible for future OAuth providers beyond the initial Google implementation.

---

## Functional Requirements

### Requirement 1: Database Schema for OAuth Connections

**User Story:** As a developer, I want a robust database schema for storing OAuth connections, so that tokens are persisted securely with all necessary metadata.

#### Acceptance Criteria

1. WHEN the database migrations run THEN an `oauth_connections` table is created with all required columns
2. WHEN a connection is created THEN a unique CUID2 identifier is generated automatically
3. WHEN storing a connection THEN the provider, name, account_email, and account_id fields are required
4. WHEN storing tokens THEN both access_token and refresh_token can be stored as TEXT fields
5. WHEN designing the schema THEN nullable `access_token_encrypted` and `refresh_token_encrypted` columns exist for future encryption
6. WHEN designing the schema THEN an `encryption_version` column (INT) tracks the encryption method used (0/null = plain)
7. WHEN a connection is saved THEN `created_at` and `updated_at` timestamps are automatically managed
8. WHEN storing expiration THEN `expires_at` is stored as a TIMESTAMP for timezone-aware comparison
9. WHEN tracking usage THEN `last_used_at`, `last_refreshed_at`, and `last_error` fields are available
10. WHEN querying connections THEN indexes exist on `provider`, `created_by`, `tenant_id`, and `account_email`
11. WHEN enforcing uniqueness THEN a composite unique constraint prevents duplicate provider+account_id+tenant_id combinations
12. WHEN storing provider-specific data THEN a `provider_data` JSON column is available

### Requirement 2: Database Schema for OAuth State (CSRF Protection)

**User Story:** As a developer, I want secure CSRF protection during OAuth flows, so that authentication cannot be hijacked by malicious actors.

#### Acceptance Criteria

1. WHEN an OAuth flow is initiated THEN a random state token is generated and stored in `oauth_states` table
2. WHEN storing state THEN the provider, code_verifier (for PKCE), redirect_url, and metadata are persisted
3. WHEN creating state THEN an expiration time of 10 minutes is set automatically
4. WHEN a callback is received THEN the state parameter is validated against stored states
5. WHEN state validation succeeds THEN the state record is deleted to prevent replay attacks
6. WHEN querying states THEN an index on the `state` column enables fast lookup
7. WHEN cleanup runs THEN expired state records are automatically removed
8. IF a state is not found or expired THEN the OAuth callback returns an appropriate error

### Requirement 3: OAuth Provider Interface and Base Class

**User Story:** As a developer, I want a unified provider interface, so that new OAuth providers can be added with minimal code changes.

#### Acceptance Criteria

1. WHEN defining a provider THEN the `OAuthProvider` interface specifies: id, name, defaultScopes, supportsPKCE
2. WHEN implementing a provider THEN methods for getAuthorizationUrl, exchangeCode, refreshToken, and getUserProfile are required
3. WHEN a provider supports it THEN an optional revokeToken method can be implemented
4. WHEN creating providers THEN an `OAuthProviderBase` abstract class provides shared implementation
5. WHEN configuring providers THEN `OAuthProviderConfig` includes clientId, clientSecret, redirectUri, and scopes
6. WHEN returning tokens THEN `OAuthTokens` normalizes accessToken, refreshToken, tokenType, expiresIn, expiresAt, and scope
7. WHEN returning user profiles THEN `OAuthUserProfile` normalizes id, email, name, and picture
8. WHEN generating auth URLs THEN `AuthUrlOptions` allows custom scopes, state, usePKCE, prompt, loginHint, and accessType
9. WHEN auth URL is generated THEN `AuthUrlResult` returns url, state, and optional codeVerifier

### Requirement 4: Provider Registry

**User Story:** As a developer, I want a centralized provider registry, so that providers can be discovered and accessed by ID.

#### Acceptance Criteria

1. WHEN the application starts THEN the ProviderRegistry is initialized as a singleton
2. WHEN registering a provider THEN the register(provider) method adds it to the registry
3. WHEN fetching a provider THEN get(providerId) returns the provider instance or undefined
4. WHEN checking availability THEN has(providerId) returns true/false
5. WHEN listing providers THEN getAll() returns all registered providers
6. WHEN the Google provider is initialized THEN it is automatically registered in the registry
7. IF a provider ID is not found THEN appropriate errors are returned to callers

### Requirement 5: Google OAuth Provider Implementation

**User Story:** As a user, I want to connect my Google account, so that workflows can access Gmail and other Google services.

#### Acceptance Criteria

1. WHEN creating the GoogleProvider THEN it extends OAuthProviderBase and implements OAuthProvider
2. WHEN identifying the provider THEN id='google' and name='Google' are set
3. WHEN setting default scopes THEN gmail.readonly, gmail.send, userinfo.email, and userinfo.profile are included
4. WHEN checking PKCE support THEN supportsPKCE=true is set
5. WHEN generating auth URL THEN the googleapis OAuth2 client is used with proper parameters
6. WHEN generating auth URL with PKCE THEN code_challenge and code_challenge_method are included
7. WHEN exchanging code THEN the oauth2Client.getToken() method is called with the authorization code
8. WHEN exchanging code with PKCE THEN the code_verifier is included in the request
9. WHEN refreshing tokens THEN oauth2Client.refreshAccessToken() is called with the refresh token
10. WHEN getting user profile THEN the Gmail API users.getProfile endpoint is called
11. WHEN tokens are returned THEN they are normalized to the OAuthTokens interface
12. WHEN profile is returned THEN it is normalized to the OAuthUserProfile interface

### Requirement 6: Connection Repository

**User Story:** As a developer, I want a repository for connection data access, so that database operations are encapsulated.

#### Acceptance Criteria

1. WHEN creating a connection THEN create(data) inserts a record and returns the full connection
2. WHEN finding by ID THEN findById(id) returns the connection or null
3. WHEN finding by provider THEN findByProvider(provider, filters) returns matching connections
4. WHEN finding by email THEN findByAccountEmail(email, provider) returns matching connections
5. WHEN updating a connection THEN update(id, updates) modifies the record and returns updated connection
6. WHEN deleting a connection THEN delete(id) removes the record and returns boolean success
7. WHEN updating token usage THEN updateLastUsed(id) sets last_used_at to current timestamp
8. WHEN recording errors THEN updateError(id, error) sets last_error and last_error_at
9. WHEN managing states THEN createState, findState, deleteState, and cleanupExpiredStates methods exist
10. WHEN using transactions THEN operations support transactional execution

### Requirement 7: Token Manager

**User Story:** As a developer, I want automatic token refresh management, so that expired tokens are refreshed transparently.

#### Acceptance Criteria

1. WHEN checking token validity THEN tokens expiring within 60 seconds are considered expired
2. WHEN a token is expired THEN ensureValidToken() automatically refreshes it using the refresh token
3. WHEN refresh succeeds THEN the new tokens are saved to the database with updated timestamps
4. WHEN refresh succeeds THEN the refresh_token is preserved if not returned by the provider (Google behavior)
5. WHEN refresh fails with invalid_grant THEN the connection is marked as inactive with error details
6. WHEN refresh fails THEN a REFRESH_TOKEN_EXPIRED error type is thrown for handling
7. WHEN getting valid tokens THEN the access_token is returned ready for API use
8. WHEN the TokenManager is accessed THEN it is a singleton instance
9. IF encryption is enabled in the future THEN encryptToken and decryptToken methods are available

### Requirement 8: Integration Manager (Main Facade)

**User Story:** As a developer, I want a single entry point for all integration operations, so that integration logic is centralized.

#### Acceptance Criteria

1. WHEN accessing IntegrationManager THEN getInstance() returns the singleton instance
2. WHEN listing connections THEN getConnections(filters) returns ConnectionSummary array without tokens
3. WHEN getting a connection THEN getConnection(id) returns full connection details or null
4. WHEN deleting a connection THEN deleteConnection(id) removes it and returns boolean success
5. WHEN renaming a connection THEN renameConnection(id, name) updates the name and returns connection
6. WHEN initiating OAuth THEN initiateOAuth(provider, options) returns { authUrl, state }
7. WHEN handling callback THEN handleCallback(provider, code, state) creates/updates connection and returns it
8. WHEN getting valid token THEN getValidToken(connectionId) returns refreshed access_token
9. WHEN testing connection THEN testConnection(connectionId) validates token and returns { valid, error? }
10. WHEN operations fail THEN appropriate error types are thrown with descriptive messages

### Requirement 9: OAuth Flow - Initiation

**User Story:** As a user, I want to start an OAuth connection, so that I can authorize access to my Google account.

#### Acceptance Criteria

1. WHEN user calls GET /integrations/oauth/google/auth THEN they are redirected to Google's consent screen
2. WHEN initiating OAuth THEN a state parameter is generated and stored in oauth_states
3. WHEN using PKCE THEN a code_verifier and code_challenge are generated and stored
4. WHEN generating auth URL THEN access_type='offline' is set to receive refresh tokens
5. WHEN generating auth URL THEN prompt='consent' ensures refresh token on every authorization
6. WHEN custom scopes are provided THEN they are added to the authorization request
7. WHEN a userId is provided THEN it is stored in the state metadata for association
8. WHEN the state is created THEN it expires in 10 minutes
9. IF the provider is not found THEN a 400 error is returned with provider not supported message

### Requirement 10: OAuth Flow - Callback Handling

**User Story:** As a user, I want the OAuth callback to be handled securely, so that my tokens are stored correctly.

#### Acceptance Criteria

1. WHEN Google redirects to /integrations/oauth/google/callback THEN the code and state are extracted
2. WHEN validating state THEN the state is looked up in oauth_states and verified
3. IF state is invalid or expired THEN a 400 error is returned with appropriate message
4. WHEN state is valid THEN the code_verifier is retrieved for PKCE verification
5. WHEN exchanging code THEN the authorization code is exchanged for tokens
6. WHEN exchange succeeds THEN user profile is fetched using the access token
7. WHEN saving connection THEN tokens, profile data, and expiration are stored
8. WHEN connection exists THEN existing connection with same provider+account is updated
9. WHEN connection is new THEN a new connection is created with auto-generated name
10. WHEN callback completes THEN the state record is deleted
11. WHEN callback completes THEN user is redirected or shown success message with connection ID
12. IF exchange fails THEN error details are returned with troubleshooting guidance

### Requirement 11: Connection Management API

**User Story:** As a user, I want to manage my OAuth connections, so that I can view, rename, test, and delete them.

#### Acceptance Criteria

1. WHEN calling GET /integrations/connections THEN all connections for the user are returned (without tokens)
2. WHEN calling GET /integrations/connections/:id THEN full connection details are returned (without tokens)
3. WHEN calling POST /integrations/connections/:id/rename THEN the connection name is updated
4. WHEN calling DELETE /integrations/connections/:id THEN the connection is removed
5. WHEN calling POST /integrations/connections/:id/test THEN token validity is tested
6. WHEN calling GET /integrations/connections/:id/token THEN a valid access token is returned (with auto-refresh)
7. WHEN connection is not found THEN 404 error is returned
8. WHEN operation succeeds THEN appropriate success response with data is returned
9. WHEN operation fails THEN appropriate error response with details is returned
10. WHEN listing connections THEN filtering by provider is supported

### Requirement 12: Provider Discovery API

**User Story:** As a developer, I want to discover available providers, so that I can show users connection options.

#### Acceptance Criteria

1. WHEN calling GET /integrations/oauth/providers THEN all registered providers are returned
2. WHEN returning providers THEN id, name, defaultScopes, and supportsPKCE are included
3. WHEN calling GET /integrations/oauth/:provider THEN specific provider details are returned
4. IF provider is not found THEN 404 error is returned
5. WHEN listing providers THEN response includes count and provider array

### Requirement 13: Token Refresh API

**User Story:** As a developer, I want to manually trigger token refresh, so that I can force refresh before automatic expiry.

#### Acceptance Criteria

1. WHEN calling POST /integrations/oauth/:provider/:id/refresh THEN token is refreshed immediately
2. WHEN refresh succeeds THEN new token details are returned (without actual tokens)
3. WHEN refresh succeeds THEN last_refreshed_at timestamp is updated
4. IF refresh fails THEN error details including required re-authentication are returned
5. IF connection is inactive THEN error indicates re-authentication is required

### Requirement 14: Integration with GoogleConnect Node

**User Story:** As a workflow designer, I want GoogleConnect node to use the new integration system, so that connections are managed centrally.

#### Acceptance Criteria

1. WHEN GoogleConnect node receives connectionId in config THEN it uses IntegrationManager to get token
2. WHEN connectionId is provided THEN the node fetches valid token via IntegrationManager.getValidToken()
3. WHEN token is obtained THEN context.state.google_token is set with the access token
4. WHEN connection info is obtained THEN context.state.gmail_profile is set with account email
5. WHEN connection succeeds THEN context.state.current_connection_id is set for tracking
6. WHEN node succeeds THEN success edge returns connectionId and email
7. IF connectionId is missing THEN error edge returns with configuration error message
8. IF token retrieval fails THEN error edge returns with requiresReauth flag when refresh expired
9. WHEN backward compatibility is needed THEN email-based lookup is supported as fallback

### Requirement 15: Integration with SendEmail Node

**User Story:** As a workflow designer, I want SendEmail node to work with the new integration system, so that emails can be sent using managed connections.

#### Acceptance Criteria

1. WHEN SendEmail node executes THEN it retrieves google_token from context.state
2. WHEN token is available THEN Gmail API is used to send the email
3. WHEN email is sent THEN success edge returns messageId, threadId, and timestamp
4. IF token is missing THEN config_error edge returns with appropriate message
5. IF required fields are missing THEN config_error edge returns with validation details
6. IF Gmail API fails THEN error edge returns with API error details

### Requirement 16: Integration with ListEmails Node

**User Story:** As a workflow designer, I want ListEmails node to work with the new integration system, so that emails can be listed using managed connections.

#### Acceptance Criteria

1. WHEN ListEmails node executes THEN it retrieves google_token from context.state
2. WHEN token is available THEN Gmail API is used to list emails with provided filters
3. WHEN emails are listed THEN success edge returns emails array with pagination token
4. WHEN no emails match THEN no_results edge is triggered
5. IF token is missing THEN config_error edge returns with appropriate message
6. IF Gmail API fails THEN error edge returns with API error details

### Requirement 17: Environment Configuration

**User Story:** As a developer, I want clear environment variable configuration, so that OAuth credentials can be securely managed.

#### Acceptance Criteria

1. WHEN configuring Google OAuth THEN GOOGLE_CLIENT_ID environment variable is required
2. WHEN configuring Google OAuth THEN GOOGLE_CLIENT_SECRET environment variable is required
3. WHEN environment variables are missing THEN startup logs clear error messages
4. WHEN environment variables are missing THEN the Google provider is not registered
5. WHEN documenting setup THEN .env.example includes all required variables with descriptions
6. WHEN callback URL is needed THEN it is constructed from server base URL + /integrations/oauth/google/callback

### Requirement 18: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling, so that issues can be diagnosed and resolved.

#### Acceptance Criteria

1. WHEN OAuth flow fails THEN detailed error messages are returned to the user
2. WHEN token refresh fails THEN the error is logged and connection is marked with error details
3. WHEN database operations fail THEN errors are caught and appropriate responses returned
4. WHEN provider errors occur THEN raw error details are logged for debugging
5. WHEN connections become invalid THEN is_active is set to false with last_error populated
6. WHEN operations succeed THEN appropriate log messages are emitted for monitoring
7. WHEN invalid input is provided THEN validation errors are returned with field details

---

## Non-Functional Requirements

### Performance

1. Token refresh operations must complete within 5 seconds
2. Connection listing must return results within 100ms for up to 100 connections
3. OAuth state lookup must be O(1) using indexed state column
4. Database queries must use appropriate indexes to avoid table scans
5. Token manager must cache provider instances to avoid repeated instantiation

### Security

1. Access tokens and refresh tokens must never be logged in plain text
2. OAuth state tokens must be cryptographically random (32+ bytes)
3. PKCE must be used for all OAuth flows that support it
4. State tokens must expire within 10 minutes to prevent CSRF attacks
5. Database schema must support future encryption without schema changes
6. API endpoints must validate user authorization before returning connection data
7. Callback URLs must be validated against configured redirect URIs

### Reliability

1. Token refresh must handle transient network failures with retry logic
2. Database connections must use connection pooling
3. State cleanup must run periodically to remove expired records
4. Connection errors must not crash the application

### Maintainability

1. All TypeScript interfaces must be fully documented with JSDoc comments
2. Provider implementations must follow the established interface contract
3. Database schema changes must use Drizzle migrations
4. Code must pass TypeScript strict mode compilation
5. Functions must be single-purpose with clear naming

### Compatibility

1. Node version: Bun 1.x runtime
2. Database: MySQL 8.0+
3. TypeScript: 5.x
4. googleapis: Latest stable version

### Code Quality

1. All public APIs must have TypeScript types exported
2. Error handling must use typed error classes
3. Repository methods must use Drizzle query builder for type safety
4. Singleton patterns must prevent multiple instantiation

---

## Out of Scope

The following features are explicitly NOT included in this implementation:

1. **Token Encryption at Rest** - Schema supports it, but implementation is deferred
2. **Additional OAuth Providers** - Only Google is implemented initially (Twitter, LinkedIn, etc. come later)
3. **UI for Connection Management** - Frontend integration is separate work
4. **Webhook Notifications** - No real-time notifications for token expiry
5. **Connection Sharing** - Connections are per-user, not shareable across users
6. **Rate Limiting** - No provider-specific rate limit handling
7. **Batch Token Operations** - No bulk token refresh or validation
8. **OAuth 1.0a Support** - Only OAuth 2.0 providers are supported
9. **Custom OAuth Scopes per Connection** - Using provider default scopes initially
10. **Connection Usage Analytics** - No tracking of which workflows use which connections

---

## Success Metrics

The implementation is considered successful when:

1. Users can initiate Google OAuth flow and receive callback
2. Tokens are stored in MySQL with all required metadata
3. Token refresh works automatically when tokens expire
4. GoogleConnect, SendEmail, and ListEmails nodes work with connectionId config
5. All connection management API endpoints function correctly
6. Provider abstraction allows easy addition of new providers (verified by code review)
7. All tests pass including OAuth flow, token refresh, and node integration
8. No security vulnerabilities in token handling or CSRF protection
9. Error messages are clear and actionable
10. Documentation is complete and accurate

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-27
**Status:** Draft - Ready for Implementation
