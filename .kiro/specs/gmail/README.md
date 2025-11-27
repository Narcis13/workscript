# OAuth Integrations System (Gmail) - Specification

**Feature:** Multi-provider OAuth integrations system with Google/Gmail as initial implementation
**Target Application:** `/apps/api/src/shared-services/integrations/`
**Status:** Ready for Implementation
**Created:** 2025-11-27
**Version:** 1.0.0

---

## Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 18 detailed user stories with acceptance criteria
   - Non-functional requirements (performance, security, reliability)
   - Success metrics and out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 98 actionable tasks organized in 10 phases
   - Checkboxes for progress tracking
   - Estimated timeline: 3-5 days

3. **[README.md](./README.md)** - This overview document

---

## Feature Overview

### What We're Building

A comprehensive OAuth integrations system that:

- Provides a unified interface for managing OAuth2 connections to third-party services
- Starts with Google/Gmail integration, designed for easy extension to other providers
- Stores OAuth tokens securely in MySQL with Drizzle ORM
- Automatically refreshes expired tokens with 60-second buffer
- Supports multiple connections per provider per user
- Integrates with existing workflow nodes (GoogleConnect, SendEmail, ListEmails)
- Follows established patterns from existing shared services (AuthManager, SessionManager)

### Key Features

- **Provider Abstraction**: Interface + base class pattern for easy provider addition
- **PKCE Support**: Enhanced security for OAuth flows
- **CSRF Protection**: State tokens with 10-minute expiration
- **Auto Token Refresh**: Transparent refresh before expiration
- **Multi-Account Support**: Connect multiple Google accounts
- **Future Encryption Ready**: Schema designed for token encryption migration
- **RESTful API**: Complete connection management endpoints
- **Node Integration**: Updated workflow nodes use connection IDs

### Technology Stack

| Technology | Purpose |
|------------|---------|
| TypeScript 5.x | Type-safe development |
| Hono.js 4.x | Web framework for API routes |
| Drizzle ORM 0.37.x | Database operations |
| MySQL 8.0+ | Token and connection storage |
| googleapis | Google OAuth2 and Gmail API |
| Bun 1.x | JavaScript runtime |

---

## Architecture

### Folder Structure

```
apps/api/src/
├── shared-services/
│   └── integrations/                    # NEW - OAuth Integrations Service
│       ├── index.ts                     # Main exports
│       ├── IntegrationManager.ts        # Main facade
│       ├── TokenManager.ts              # Token refresh logic
│       │
│       ├── providers/
│       │   ├── types.ts                 # All interfaces
│       │   ├── base.ts                  # OAuthProviderBase
│       │   ├── registry.ts              # ProviderRegistry singleton
│       │   └── google/
│       │       └── index.ts             # GoogleProvider
│       │
│       └── repositories/
│           └── connectionRepository.ts  # Database operations
│
├── db/schema/
│   └── integrations.schema.ts           # NEW - Database tables
│
├── routes/
│   └── integrations.ts                  # NEW - API routes
│
└── index.ts                             # Mount routes & init providers
```

### Key Components

| Component | Responsibility |
|-----------|----------------|
| `IntegrationManager` | Main facade for all integration operations |
| `TokenManager` | Token refresh with 60-second buffer |
| `ProviderRegistry` | Register and lookup OAuth providers |
| `GoogleProvider` | Google OAuth2 implementation |
| `ConnectionRepository` | Database CRUD operations |

### Database Tables

| Table | Purpose |
|-------|---------|
| `oauth_connections` | Store connections with tokens and metadata |
| `oauth_states` | CSRF protection during OAuth flows |

---

## Implementation Phases

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| 1. Database Foundation | Schema creation, migrations | 0.5 days |
| 2. Type Definitions | All TypeScript interfaces | 0.5 days |
| 3. Provider System | Base class, registry, GoogleProvider | 1 day |
| 4. Data Layer | Connection repository | 0.5 days |
| 5. Service Layer | TokenManager, IntegrationManager | 0.5 days |
| 6. API Routes | All integration endpoints | 0.5 days |
| 7. Node Integration | Update Gmail workflow nodes | 0.25 days |
| 8. Configuration | Environment variables | 0.1 days |
| 9. Testing | Manual and integration tests | 0.5 days |
| 10. Documentation | JSDoc, README, CLAUDE.md | 0.25 days |

**Total Estimated Time:** 3-5 days

---

## Quick Start Guide

### For Developers

1. **Read the requirements document**
   ```bash
   cat .kiro/specs/gmail/requirements.md
   ```

2. **Review the implementation plan**
   ```bash
   cat .kiro/specs/gmail/implementation_plan.md
   ```

3. **Start with Phase 1: Database Foundation**
   - Create `integrations.schema.ts`
   - Run migrations
   - Verify tables in database

4. **Follow tasks in order**
   - Each task has checkboxes for tracking
   - Tasks reference specific requirements
   - Complete one phase before moving to next

5. **Test incrementally**
   - Test each component as you build
   - Use manual testing in Phase 9 as final verification

### For Reviewers

1. **Check requirements coverage**
   - Each task references requirement numbers
   - Verify acceptance criteria are met

2. **Review code quality**
   - TypeScript types are comprehensive
   - JSDoc documentation is present
   - Error handling is consistent

3. **Test the OAuth flow**
   - Complete full OAuth cycle
   - Verify token refresh works
   - Test error scenarios

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/integrations/oauth/providers` | List available providers |
| GET | `/integrations/oauth/:provider` | Get provider details |
| GET | `/integrations/oauth/:provider/auth` | Start OAuth flow |
| GET | `/integrations/oauth/:provider/callback` | OAuth callback handler |
| POST | `/integrations/oauth/:provider/:id/refresh` | Manual token refresh |
| GET | `/integrations/connections` | List all connections |
| GET | `/integrations/connections/:id` | Get connection details |
| POST | `/integrations/connections/:id/rename` | Rename connection |
| DELETE | `/integrations/connections/:id` | Delete connection |
| POST | `/integrations/connections/:id/test` | Test connection |
| GET | `/integrations/connections/:id/token` | Get valid access token |

---

## Success Criteria

- [ ] Database schema created with all required columns
- [ ] Google OAuth flow works end-to-end
- [ ] Tokens stored and retrieved correctly
- [ ] Auto-refresh works when tokens expire
- [ ] Multiple connections can be created
- [ ] All API endpoints return correct responses
- [ ] GoogleConnect node works with connectionId
- [ ] SendEmail and ListEmails nodes work with new system
- [ ] Error handling is comprehensive and informative
- [ ] TypeScript compilation passes without errors
- [ ] Documentation is complete

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| CSRF attacks | State tokens with 10-minute expiration |
| Token exposure | Tokens never returned in API responses (except dedicated endpoint) |
| Token interception | PKCE flow for Google OAuth |
| Token theft | Access tokens short-lived (~1 hour), refresh tokens protected |
| Future encryption | Schema supports encrypted columns for future migration |
| Logging | Tokens never logged in plain text |

---

## Progress Tracking

### Using the Implementation Plan

1. Open `implementation_plan.md` in your editor
2. Check off tasks as you complete them: `- [ ]` → `- [x]`
3. Each phase should be completed before moving to the next
4. If blocked, note the issue in the task description

### Key Milestones to Track

1. **Database Ready** - Phase 1 complete
2. **Types Defined** - Phase 2 complete
3. **Provider Working** - Phase 3 complete (test with Google OAuth)
4. **API Complete** - Phase 6 complete (all endpoints working)
5. **Nodes Updated** - Phase 7 complete
6. **Fully Tested** - Phase 9 complete
7. **Documentation Done** - Phase 10 complete

---

## Out of Scope

The following are explicitly NOT included in this implementation:

- Token encryption at rest (schema supports it, implementation deferred)
- Additional OAuth providers (Twitter, LinkedIn, etc.)
- Frontend UI for connection management
- Webhook notifications for token expiry
- Connection sharing between users
- Rate limiting per provider
- OAuth 1.0a support
- Custom scopes per connection
- Usage analytics

---

## Future Enhancements

After this implementation is complete, the following can be added:

1. **New Providers**: Twitter, LinkedIn, Reddit, TikTok, YouTube
2. **Token Encryption**: Implement AES-256 encryption using existing schema columns
3. **UI Integration**: Frontend components for connection management
4. **Webhooks**: Notify when tokens expire or connections become invalid
5. **Analytics**: Track which workflows use which connections

---

## Related Documentation

- [CLAUDE.md](../../../CLAUDE.md) - Project architecture overview
- [Design Document](../json-workflow-engine/design.md) - Workflow engine architecture
- [Old Implementation](../../../server/src/lib/google-oauth2.ts) - Legacy OAuth reference

---

## Environment Variables

```bash
# Required for Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional - defaults to http://localhost:3013
API_BASE_URL=http://localhost:3013

# Update in Google Cloud Console:
# Authorized redirect URI: http://localhost:3013/integrations/oauth/google/callback
```

---

## Contributing

When implementing this feature:

1. **Follow the task order** - Dependencies are already considered
2. **Reference requirements** - Each task links to requirements for context
3. **Test incrementally** - Don't wait until the end to test
4. **Document as you go** - Add JSDoc when creating functions
5. **Keep it simple** - Avoid over-engineering, follow existing patterns

---

**Happy Coding!**
