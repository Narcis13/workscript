# Integrations UI - Specification

**Feature:** Third-party OAuth Integration Management UI
**Target Application:** `apps/frontend` (React + Vite SPA)
**Status:** 📋 Ready for Implementation
**Created:** 2025-11-27
**Version:** 1.0.0

---

## 📁 Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 22 detailed user stories with acceptance criteria
   - Non-functional requirements (performance, security, accessibility)
   - Success metrics and out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 118 actionable tasks organized in 13 phases
   - Checkboxes for progress tracking
   - Estimated timeline: 4-6 days

3. **[README.md](./README.md)** - This overview document

---

## 🎯 Feature Overview

### What We're Building

A new "Integrations" section in the Workscript frontend that allows users to:

- **View available OAuth providers** (Google active, Microsoft/Slack/Notion as "Coming Soon")
- **Connect accounts** via OAuth flow opening in a new browser tab
- **Manage connections** - view status, rename, test, and disconnect
- **Handle errors** - clear feedback for expired tokens, failed connections
- **Re-authenticate** - easily reconnect expired or invalid connections

### Technology Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite 7 | Build tool |
| TypeScript 5.9 | Type safety |
| React Query v5 | Server state management |
| shadcn/ui | UI component library |
| Tailwind CSS v4 | Styling |
| Sonner | Toast notifications |
| Lucide React | Icons |
| date-fns | Date formatting |

---

## 🏗️ Architecture

### Page Structure

```
/integrations                    # Main integrations page
/integrations/oauth/callback     # OAuth callback handler
```

### Component Hierarchy

```
IntegrationsPage
├── PageHeader
├── Available Providers Section
│   ├── ProviderCard (Google - active)
│   ├── ProviderCard (Microsoft - coming soon)
│   ├── ProviderCard (Slack - coming soon)
│   └── ProviderCard (Notion - coming soon)
├── Separator
├── My Connections Section
│   ├── EmptyState (if no connections)
│   └── Provider Groups
│       ├── GroupHeader ("Google (2)")
│       └── Connection Grid
│           ├── ConnectionCard
│           └── ConnectionCard
├── RenameConnectionDialog
└── DisconnectConfirmDialog

OAuthCallbackPage
├── Success State (checkmark, message)
└── Error State (warning, retry button)
```

### File Structure

```
apps/frontend/src/
├── types/
│   └── integration.types.ts      # TypeScript definitions
├── lib/
│   ├── providerConfig.ts         # Provider UI metadata & icons
│   └── connectionUtils.ts        # Status logic, formatting
├── services/api/
│   └── integrations.api.ts       # API client functions
├── hooks/api/
│   └── useIntegrations.ts        # React Query hooks
├── components/integrations/
│   ├── index.ts                  # Barrel exports
│   ├── ProviderCard.tsx          # Provider display
│   ├── ProviderCardSkeleton.tsx  # Loading state
│   ├── ConnectionCard.tsx        # Connection display
│   ├── ConnectionCardSkeleton.tsx # Loading state
│   ├── RenameConnectionDialog.tsx # Rename modal
│   └── DisconnectConfirmDialog.tsx # Confirm disconnect
└── pages/integrations/
    ├── IntegrationsPage.tsx      # Main page
    └── OAuthCallbackPage.tsx     # Callback handler
```

---

## 📋 Implementation Phases

| Phase | Description | Duration |
|-------|-------------|----------|
| 1. Foundation | Types, provider config | 0.5 days |
| 2. API Service | API client functions | 0.5 days |
| 3. React Query | Data fetching hooks | 0.5 days |
| 4. Provider Cards | Provider UI components | 0.5 days |
| 5. Connection Cards | Connection UI components | 0.5 days |
| 6. Dialogs | Rename, disconnect modals | 0.5 days |
| 7. Main Page | IntegrationsPage implementation | 1 day |
| 8. Callback Page | OAuth callback handler | 0.5 days |
| 9. Routing | Route config, sidebar nav | 0.25 days |
| 10. Exports | Barrel exports, cleanup | 0.25 days |
| 11. Responsive | Mobile, tablet, desktop testing | 0.5 days |
| 12. Error Handling | Edge cases, error states | 0.25 days |
| 13. Verification | Build, test, review | 0.5 days |

**Total: 4-6 days**

---

## 🚀 Quick Start Guide

### For Developers

1. **Read the requirements document**
   ```bash
   cat .kiro/specs/int_ui/requirements.md
   ```

2. **Review the implementation plan**
   ```bash
   cat .kiro/specs/int_ui/implementation_plan.md
   ```

3. **Start with Phase 1: Foundation**
   - Create `types/integration.types.ts`
   - Create `lib/providerConfig.ts`

4. **Work through phases sequentially**
   - Check off tasks as you complete them
   - Each phase builds on the previous

5. **Test as you go**
   - Run `bun run dev` to test locally
   - Verify UI matches design

### For Reviewers

1. **Check requirements coverage**
   - Each of the 22 requirements should be implemented
   - Acceptance criteria should be verifiable

2. **Verify UI consistency**
   - Components should match existing app style
   - shadcn/ui components used correctly

3. **Test OAuth flow**
   - Connect a real Google account
   - Verify callback page works
   - Test connection management

4. **Check responsive design**
   - Mobile: 320px - 640px
   - Tablet: 640px - 1024px
   - Desktop: 1024px+

---

## ✅ Success Criteria

The implementation is complete when:

- [ ] Navigation item appears in sidebar
- [ ] Available Providers section shows Google + 3 "Coming Soon" providers
- [ ] OAuth flow works via new browser tab
- [ ] Connections display grouped by provider
- [ ] Rename dialog works correctly
- [ ] Test connection provides feedback
- [ ] Disconnect removes connection
- [ ] Empty state shows when no connections
- [ ] Loading skeletons display during fetch
- [ ] Error states show with retry option
- [ ] Responsive on mobile, tablet, desktop
- [ ] Keyboard accessible
- [ ] Screen reader compatible
- [ ] TypeScript compiles without errors
- [ ] Production build succeeds

---

## 🔒 Security Considerations

1. **OAuth tokens are never exposed in the frontend**
   - Backend handles all token storage
   - Frontend only sees connection summaries

2. **CSRF protection via state tokens**
   - Backend validates state on callback
   - Frontend trusts backend validation

3. **Authentication required**
   - All routes are protected
   - API calls include Bearer token

4. **Error messages are sanitized**
   - No sensitive info in error displays
   - User-friendly messages only

---

## 📊 Progress Tracking

Track implementation progress by checking off tasks in `implementation_plan.md`:

```markdown
- [x] Task 1.1.1: Create integration types file
- [x] Task 1.1.2: Define ConnectionSummary type
- [ ] Task 1.1.3: Define TestConnectionResult type
```

Use this command to see completion percentage:
```bash
grep -c "\[x\]" .kiro/specs/int_ui/implementation_plan.md
grep -c "\[ \]" .kiro/specs/int_ui/implementation_plan.md
```

---

## 🚫 Out of Scope

The following are explicitly NOT included:

- Backend OAuth implementation (already done)
- Token refresh API endpoints
- Webhook notifications for token expiry
- Usage analytics dashboard
- Bulk connection operations
- Connection sharing between users
- Custom OAuth scopes UI
- Provider ordering customization
- Connection data export
- Advanced search/filtering

---

## 📚 Related Documentation

| Document | Location |
|----------|----------|
| Gmail Integration Specs | `.kiro/specs/gmail/` |
| Backend Integration Code | `apps/api/src/shared-services/integrations/` |
| Frontend Architecture | `apps/frontend/README.md` |
| shadcn/ui Components | `apps/frontend/src/components/ui/` |
| Existing Pages (patterns) | `apps/frontend/src/pages/` |

---

## 🤝 Contributing

When implementing this feature:

1. **Follow existing patterns** - Look at WorkflowsPage, AutomationsPage for reference
2. **Use shadcn/ui components** - Don't create custom components unless necessary
3. **Type everything** - No `any` types, full TypeScript coverage
4. **Handle errors gracefully** - Users should never see raw error messages
5. **Test accessibility** - Use keyboard, check with screen reader
6. **Document changes** - Update this README if architecture changes

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OAuth Flow | New Tab | Most reliable, no popup blocker issues |
| Future Providers | Visible Placeholders | Shows platform potential |
| Connection Layout | Grouped by Provider | Cleaner organization |
| Icons | Inline SVG Components | Flexibility, no external deps |
| State Management | React Query | Consistent with app patterns |

---

**Happy Coding! 🎉**

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-27
**Status:** Ready for Implementation
