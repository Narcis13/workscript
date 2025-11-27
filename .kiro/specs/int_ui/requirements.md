# Requirements Document: Integrations UI

## Introduction

The Integrations UI is a comprehensive frontend section for the Workscript application that enables users to manage OAuth connections to third-party platforms. Starting with Google/Gmail integration and designed for extensibility to support future providers like Microsoft, Slack, and Notion, this feature provides a seamless experience for connecting external services to workflow automation.

This feature integrates with the existing React + Vite frontend application, utilizing shadcn/ui components, Tailwind CSS v4, React Query for server state management, and the established backend OAuth infrastructure. The UI follows the same patterns and conventions as existing pages (Workflows, Automations, Executions) to ensure visual and functional consistency.

The backend OAuth system is fully implemented with endpoints for provider discovery, OAuth flow initiation/callback handling, and connection management (CRUD operations, testing, token refresh). This specification focuses exclusively on the frontend implementation to expose these capabilities through an intuitive, user-friendly interface.

---

## Functional Requirements

### Requirement 1: Integrations Page Navigation

**User Story:** As a user, I want to access the Integrations page from the main navigation sidebar, so that I can easily manage my third-party connections.

#### Acceptance Criteria

1. WHEN the user views the sidebar navigation THEN a new "Integrations" menu item with a Plug icon is visible
2. WHEN the user clicks the "Integrations" menu item THEN they are navigated to `/integrations` route
3. WHEN the user is on the Integrations page THEN the sidebar item is highlighted as active
4. WHEN the user is on any sub-route of integrations THEN the sidebar item remains highlighted
5. WHEN the application loads THEN the Integrations page component is lazy-loaded for performance
6. IF the user is not authenticated THEN they are redirected to the login page
7. WHEN the page loads THEN a PageHeader component displays "Integrations" title and description
8. WHEN the user accesses `/integrations` directly THEN the page renders correctly without requiring prior navigation

---

### Requirement 2: Available Providers Display

**User Story:** As a user, I want to see all available integration providers, so that I know what services I can connect to my workflows.

#### Acceptance Criteria

1. WHEN the Integrations page loads THEN a grid of provider cards is displayed under "Available Providers" section
2. WHEN providers are loading THEN skeleton loader cards are displayed
3. WHEN providers fail to load THEN an error message with a retry button is displayed
4. WHEN the API returns providers THEN each provider is displayed as a distinct card
5. WHEN displaying a provider card THEN the provider icon, name, and description are visible
6. WHEN a provider is available (e.g., Google) THEN a "Connect" button is enabled
7. WHEN a provider is coming soon (e.g., Microsoft, Slack, Notion) THEN the card appears muted with "Coming Soon" badge
8. WHEN a coming-soon provider is displayed THEN the Connect button is disabled
9. WHEN the user has existing connections for a provider THEN a badge shows the connection count (e.g., "2 connected")
10. WHEN viewing on mobile (<640px) THEN provider cards display in a single column
11. WHEN viewing on tablet (640-1024px) THEN provider cards display in 2 columns
12. WHEN viewing on desktop (>1024px) THEN provider cards display in 3 columns

---

### Requirement 3: Provider Card Component

**User Story:** As a user, I want each provider card to show relevant information and actions, so that I can quickly understand and connect to services.

#### Acceptance Criteria

1. WHEN a provider card renders THEN the provider's branded icon is displayed prominently
2. WHEN a provider card renders THEN the provider name is displayed as the card title
3. WHEN a provider card renders THEN a brief description of the provider's capabilities is shown
4. WHEN a provider has active connections THEN a secondary badge shows the count
5. WHEN the user hovers over an available provider THEN the card shows a subtle hover effect
6. WHEN the user hovers over a coming-soon provider THEN a tooltip indicates "Available soon"
7. WHEN the Connect button is clicked THEN a loading state is shown on the button
8. WHEN the Connect button is clicked THEN OAuth authentication flow initiates
9. IF the provider config includes a brand color THEN it's used for accent styling
10. WHEN the card is focused via keyboard THEN a visible focus ring appears

---

### Requirement 4: OAuth Authentication Flow (New Tab)

**User Story:** As a user, I want to authenticate with third-party providers in a new browser tab, so that I don't lose my current page context.

#### Acceptance Criteria

1. WHEN the user clicks "Connect" on a provider THEN a new browser tab opens with the provider's OAuth URL
2. WHEN the OAuth tab opens THEN the original tab remains on the Integrations page
3. WHEN authentication succeeds THEN the callback page displays a success message
4. WHEN authentication fails THEN the callback page displays an error message with details
5. WHEN the callback page shows success THEN it displays "You can now close this tab" instruction
6. WHEN the callback page shows an error THEN a "Try Again" button is provided
7. WHEN the user returns to the original tab THEN they can click a refresh button to see new connections
8. WHEN a new connection is created THEN the connections list updates to show it
9. IF the OAuth state token is invalid THEN an appropriate error message is shown
10. IF the OAuth state token is expired THEN the user is instructed to retry
11. WHEN OAuth completes successfully THEN a toast notification confirms the connection
12. IF OAuth fails THEN a toast notification displays the error reason

---

### Requirement 5: OAuth Callback Page

**User Story:** As a user, I want clear feedback after OAuth authentication, so that I know whether my connection was successful.

#### Acceptance Criteria

1. WHEN the callback URL is accessed THEN the page parses success/error parameters from URL
2. WHEN authentication succeeded THEN a large checkmark icon is displayed
3. WHEN authentication succeeded THEN the text "Connection Successful!" is displayed
4. WHEN authentication succeeded THEN the connected account email is shown
5. WHEN authentication succeeded THEN "You can now close this tab and return to your application" is displayed
6. WHEN authentication failed THEN a large X or warning icon is displayed
7. WHEN authentication failed THEN the error message from the backend is displayed
8. WHEN authentication failed THEN a "Try Again" button redirects to the auth initiation
9. WHEN the callback page loads THEN the page should not auto-close (user closes manually)
10. WHEN the page renders THEN it uses minimal, clean styling consistent with the app theme
11. IF the callback has no parameters THEN an appropriate "Invalid callback" message is shown
12. WHEN success is displayed THEN the provider name is mentioned in the message

---

### Requirement 6: My Connections Section

**User Story:** As a user, I want to see all my connected accounts organized by provider, so that I can manage my integrations effectively.

#### Acceptance Criteria

1. WHEN the Integrations page loads THEN a "My Connections" section is displayed below providers
2. WHEN connections are loading THEN skeleton loader cards are displayed
3. WHEN the user has no connections THEN an empty state with guidance is displayed
4. WHEN the user has connections THEN they are grouped by provider (e.g., "Google (2)")
5. WHEN a provider group has connections THEN a count badge shows the number
6. WHEN displaying connections THEN they appear in a responsive grid layout
7. WHEN viewing on mobile/tablet THEN connections display in 1 column
8. WHEN viewing on desktop THEN connections display in 2 columns
9. WHEN a connection exists THEN a ConnectionCard component displays its details
10. IF a provider has no connections THEN that provider group is not shown in My Connections
11. WHEN connections are refetched THEN the UI updates without full page reload
12. WHEN the page is revisited THEN cached connection data is shown while refetching

---

### Requirement 7: Connection Card Component

**User Story:** As a user, I want to see detailed information about each connection, so that I can understand its status and manage it.

#### Acceptance Criteria

1. WHEN a connection card renders THEN the provider icon is displayed
2. WHEN a connection card renders THEN the account email is prominently displayed
3. WHEN a connection card renders THEN the user-defined name (if set) is displayed
4. WHEN a connection card renders THEN the account display name from the provider is shown
5. WHEN a connection is active THEN a green "Active" status badge is displayed
6. WHEN a connection token expires within 24 hours THEN a yellow "Expiring Soon" badge is displayed
7. WHEN a connection is inactive (needs re-auth) THEN a red "Needs Re-auth" badge is displayed
8. WHEN a connection has lastUsedAt THEN it displays as relative time (e.g., "2 hours ago")
9. WHEN a connection has createdAt THEN it displays as formatted date
10. WHEN a connection is inactive THEN a prominent "Reconnect" button is displayed
11. WHEN a connection card renders THEN an actions dropdown menu is available
12. WHEN the user hovers over the card THEN a subtle hover effect is shown

---

### Requirement 8: Connection Status Logic

**User Story:** As a user, I want visual indicators of connection health, so that I can proactively address issues.

#### Acceptance Criteria

1. WHEN `isActive` is false THEN status is "Needs Re-auth" with destructive variant
2. WHEN `isActive` is true AND `expiresAt` is null THEN status is "Active" with default variant
3. WHEN `isActive` is true AND `expiresAt` is past THEN status is "Expired" with destructive variant
4. WHEN `isActive` is true AND `expiresAt` is within 24 hours THEN status is "Expiring Soon" with warning variant
5. WHEN `isActive` is true AND `expiresAt` is more than 24 hours away THEN status is "Active" with default variant
6. IF `lastError` is present THEN a warning icon with tooltip shows the error message
7. WHEN status is "Needs Re-auth" THEN the card has a warning banner prompting action
8. WHEN status changes THEN the badge updates without page reload
9. WHEN testing a connection THEN the status updates based on the test result
10. IF `lastUsedAt` is null THEN display "Never used" instead of relative time

---

### Requirement 9: Connection Actions - Rename

**User Story:** As a user, I want to rename my connections with custom labels, so that I can easily identify them.

#### Acceptance Criteria

1. WHEN the user clicks "Rename" from the actions menu THEN a rename dialog opens
2. WHEN the rename dialog opens THEN the current name is pre-filled in the input
3. WHEN the user modifies the name THEN the Save button becomes enabled
4. WHEN the name is empty THEN the Save button is disabled with validation error
5. WHEN the name exceeds 100 characters THEN a validation error is displayed
6. WHEN the user clicks Save THEN a loading state is shown on the button
7. WHEN the rename succeeds THEN the dialog closes and connection updates
8. WHEN the rename succeeds THEN a success toast notification is shown
9. WHEN the rename fails THEN an error toast notification is shown
10. WHEN the rename fails THEN the dialog remains open for retry
11. WHEN the user clicks Cancel THEN the dialog closes without changes
12. WHEN the dialog closes THEN focus returns to the triggering element

---

### Requirement 10: Connection Actions - Test Connection

**User Story:** As a user, I want to test if my connections are working, so that I can verify they're properly configured.

#### Acceptance Criteria

1. WHEN the user clicks "Test" from the actions menu THEN a loading indicator appears
2. WHEN the test is running THEN the button shows a spinner icon
3. WHEN the test succeeds THEN a success toast "Connection is valid" is shown
4. WHEN the test fails THEN an error toast with the failure reason is shown
5. WHEN the test completes THEN the connection status badge updates if needed
6. WHEN the test indicates re-auth needed THEN the status changes to "Needs Re-auth"
7. IF the connection is already testing THEN additional test clicks are ignored
8. WHEN the test API call fails THEN an appropriate error message is displayed
9. WHEN the test completes THEN the loading indicator is removed
10. IF multiple connections are tested THEN each maintains independent loading state

---

### Requirement 11: Connection Actions - Disconnect

**User Story:** As a user, I want to disconnect accounts I no longer need, so that I can manage my integrations.

#### Acceptance Criteria

1. WHEN the user clicks "Disconnect" from the actions menu THEN a confirmation dialog appears
2. WHEN the confirmation dialog opens THEN it displays the connection name/email
3. WHEN the confirmation dialog opens THEN it warns about workflow impact
4. WHEN the user clicks "Disconnect" in the dialog THEN a loading state is shown
5. WHEN the deletion succeeds THEN the dialog closes and connection is removed
6. WHEN the deletion succeeds THEN a success toast notification is shown
7. WHEN the deletion fails THEN an error toast notification is shown
8. WHEN the deletion succeeds THEN the connections list updates immediately (optimistic update)
9. WHEN the deletion fails THEN the connection is restored to the list
10. WHEN the user clicks "Cancel" THEN the dialog closes without action
11. WHEN the dialog opens THEN the destructive action button is visually distinct (red)
12. WHEN the last connection for a provider is deleted THEN that provider group disappears

---

### Requirement 12: Connection Actions - Reconnect

**User Story:** As a user, I want to easily reconnect expired or invalid connections, so that I can restore workflow functionality.

#### Acceptance Criteria

1. WHEN a connection is inactive THEN a "Reconnect" button is prominently displayed on the card
2. WHEN the user clicks "Reconnect" THEN the OAuth flow initiates for that provider
3. WHEN reconnection succeeds THEN the existing connection is updated with new tokens
4. WHEN reconnection succeeds THEN the status changes to "Active"
5. WHEN reconnection fails THEN an error message is displayed
6. WHEN reconnecting THEN the button shows a loading state
7. IF the user cancels OAuth THEN no changes are made to the connection
8. WHEN reconnection updates the connection THEN lastRefreshedAt is updated
9. WHEN reconnection succeeds THEN any lastError is cleared
10. WHEN the Reconnect button is clicked THEN a new tab opens for OAuth (consistent with Connect)

---

### Requirement 13: Empty States

**User Story:** As a user, I want helpful guidance when I have no connections, so that I know how to get started.

#### Acceptance Criteria

1. WHEN no connections exist THEN an empty state component is displayed
2. WHEN empty state is shown THEN a relevant icon (Plug) is displayed
3. WHEN empty state is shown THEN the title "No connections yet" is displayed
4. WHEN empty state is shown THEN guidance text encourages connecting an account
5. WHEN empty state is shown THEN it references the Available Providers section above
6. WHEN providers are available THEN the empty state doesn't include a redundant CTA button
7. IF all providers are coming soon THEN the empty state indicates to check back later
8. WHEN the first connection is created THEN the empty state disappears
9. WHEN viewing on mobile THEN the empty state is properly sized and readable
10. WHEN the empty state is visible THEN it's centered within the section

---

### Requirement 14: Loading States

**User Story:** As a user, I want smooth loading experiences, so that I know the application is working.

#### Acceptance Criteria

1. WHEN providers are loading THEN 3-4 skeleton provider cards are displayed
2. WHEN connections are loading THEN 2-3 skeleton connection cards are displayed
3. WHEN a provider skeleton renders THEN it matches the provider card dimensions
4. WHEN a connection skeleton renders THEN it matches the connection card dimensions
5. WHEN data loads successfully THEN skeletons transition smoothly to real content
6. WHEN individual actions are loading THEN only that element shows a spinner
7. WHEN the entire page is loading THEN a consistent loading pattern is shown
8. IF data is cached THEN cached data shows while background refetch occurs
9. WHEN skeleton loaders render THEN they use the pulse animation
10. WHEN refetching connections THEN existing data remains visible during refetch

---

### Requirement 15: Error Handling

**User Story:** As a user, I want clear error messages and recovery options, so that I can resolve issues.

#### Acceptance Criteria

1. WHEN providers fail to load THEN an error alert with retry button is shown
2. WHEN connections fail to load THEN an error alert with retry button is shown
3. WHEN an action fails THEN a descriptive toast notification appears
4. WHEN a mutation fails THEN the error message from the API is displayed
5. WHEN an error occurs THEN the error doesn't crash the entire page
6. WHEN the API returns a structured error THEN the message field is displayed
7. IF the API returns a generic error THEN a user-friendly fallback message is shown
8. WHEN a retry action is clicked THEN the failed request is re-attempted
9. WHEN retrying succeeds THEN the error state clears
10. IF authentication fails THEN the user is redirected to login
11. WHEN a network error occurs THEN "Unable to connect. Please check your connection." is shown
12. WHEN errors occur THEN they are logged for debugging (console in development)

---

### Requirement 16: API Service Layer

**User Story:** As a developer, I want a well-structured API service, so that I can maintain and extend the integration features.

#### Acceptance Criteria

1. WHEN the API service is created THEN it exports functions for all integration endpoints
2. WHEN fetchProviders is called THEN it calls GET /integrations/oauth/providers
3. WHEN fetchConnections is called THEN it calls GET /integrations/connections
4. WHEN renameConnection is called THEN it calls POST /integrations/connections/:id/rename
5. WHEN deleteConnection is called THEN it calls DELETE /integrations/connections/:id
6. WHEN testConnection is called THEN it calls POST /integrations/connections/:id/test
7. WHEN getOAuthAuthUrl is called THEN it constructs the OAuth initiation URL
8. WHEN API responses include data THEN it's properly parsed and returned
9. WHEN API responses include errors THEN they're propagated to callers
10. WHEN optional query params are passed THEN they're included in the request
11. IF the access token is expired THEN the API client refreshes it automatically
12. WHEN making API calls THEN the Authorization header includes the Bearer token

---

### Requirement 17: React Query Hooks

**User Story:** As a developer, I want React Query hooks for data fetching, so that I have consistent caching and state management.

#### Acceptance Criteria

1. WHEN useProviders is called THEN it returns providers data with loading/error states
2. WHEN useConnections is called THEN it returns connections data with loading/error states
3. WHEN useRenameConnection is called THEN it returns a mutation with success/error handling
4. WHEN useDeleteConnection is called THEN it performs optimistic updates
5. WHEN useTestConnection is called THEN it invalidates connection queries on success
6. WHEN a mutation succeeds THEN relevant queries are invalidated for refetch
7. WHEN query keys are structured THEN they follow the pattern ['integrations', 'resource', id]
8. WHEN providers are fetched THEN they're cached for 30 minutes
9. WHEN connections are fetched THEN they're cached for 2 minutes
10. WHEN the window regains focus THEN connections are refetched automatically
11. IF a mutation fails THEN optimistic updates are rolled back
12. WHEN toast notifications are shown THEN they include descriptive messages

---

### Requirement 18: Type Definitions

**User Story:** As a developer, I want comprehensive TypeScript types, so that I have type safety throughout the codebase.

#### Acceptance Criteria

1. WHEN ProviderMetadata type is defined THEN it includes id, name, version, scopes, supportsPKCE, supportsRefresh
2. WHEN ConnectionSummary type is defined THEN it includes all API response fields
3. WHEN TestConnectionResult type is defined THEN it includes valid boolean and optional error
4. WHEN API response types are defined THEN they wrap data with success and count fields
5. WHEN OAuthInitiateParams type is defined THEN it includes optional userId, tenantId, redirect
6. WHEN component props are typed THEN they use interface definitions
7. WHEN hook return types are used THEN they leverage React Query's type inference
8. WHEN date fields are typed THEN they allow Date, string, or null
9. IF the API shape changes THEN types can be updated in one location
10. WHEN types are exported THEN they're available for import throughout the app

---

### Requirement 19: Provider Configuration

**User Story:** As a developer, I want centralized provider UI configuration, so that adding new providers is straightforward.

#### Acceptance Criteria

1. WHEN providerConfig is created THEN it includes metadata for Google
2. WHEN providerConfig is created THEN it includes placeholders for Microsoft, Slack, Notion
3. WHEN a provider config is defined THEN it includes name, description, icon, brandColor
4. WHEN a provider config is defined THEN it includes isAvailable and comingSoon flags
5. WHEN getProviderConfig is called with an ID THEN it returns that provider's config
6. WHEN getProviderConfig is called with unknown ID THEN it returns a default config
7. WHEN provider icons are defined THEN they're SVG components for flexibility
8. WHEN brand colors are defined THEN they're valid CSS color values
9. IF a new provider is added THEN only the config file needs updating
10. WHEN descriptions are written THEN they explain what services can be connected

---

### Requirement 20: Responsive Design

**User Story:** As a user, I want the Integrations page to work well on all devices, so that I can manage connections anywhere.

#### Acceptance Criteria

1. WHEN viewing on mobile (<640px) THEN all content is single-column
2. WHEN viewing on tablet (640-1024px) THEN provider cards are 2-column, connections are 1-column
3. WHEN viewing on desktop (>1024px) THEN provider cards are 3-column, connections are 2-column
4. WHEN viewing on mobile THEN touch targets are at least 44x44px
5. WHEN dialogs open on mobile THEN they're full-width with appropriate padding
6. WHEN the page renders on mobile THEN content doesn't overflow horizontally
7. WHEN long text is displayed THEN it truncates with ellipsis appropriately
8. WHEN the sidebar collapses on mobile THEN it uses the Sheet component
9. WHEN actions dropdown opens THEN it doesn't get cut off on screen edges
10. WHEN testing responsive behavior THEN Tailwind breakpoints are used consistently

---

### Requirement 21: Accessibility

**User Story:** As a user with accessibility needs, I want the Integrations UI to be fully accessible, so that I can use it with assistive technologies.

#### Acceptance Criteria

1. WHEN using keyboard navigation THEN all interactive elements are reachable via Tab
2. WHEN an element is focused THEN a visible focus ring is displayed
3. WHEN status badges are displayed THEN they have appropriate ARIA labels
4. WHEN dialogs open THEN focus is trapped within the dialog
5. WHEN dialogs close THEN focus returns to the triggering element
6. WHEN buttons have icons only THEN they have descriptive aria-labels
7. WHEN loading states occur THEN screen readers announce "Loading..."
8. WHEN toast notifications appear THEN they're announced by screen readers
9. WHEN using color to indicate status THEN text/icon alternatives are also used
10. WHEN dropdown menus open THEN they're navigable with arrow keys
11. WHEN images/icons are decorative THEN they have aria-hidden="true"
12. WHEN forms have validation errors THEN they're associated with aria-describedby

---

### Requirement 22: Route Configuration

**User Story:** As a developer, I want proper route configuration, so that the Integrations pages are correctly accessible.

#### Acceptance Criteria

1. WHEN routes are configured THEN /integrations is added as a protected route
2. WHEN routes are configured THEN /integrations/oauth/callback is added
3. WHEN IntegrationsPage is imported THEN it uses React.lazy for code splitting
4. WHEN OAuthCallbackPage is imported THEN it uses React.lazy for code splitting
5. WHEN routes render THEN they're wrapped with RouteErrorBoundary
6. WHEN an unauthenticated user accesses /integrations THEN they're redirected to login
7. WHEN routes are defined THEN they're children of the AppLayout route
8. WHEN the callback route is accessed THEN it doesn't require AppLayout (minimal page)
9. IF the route throws an error THEN the error boundary catches it gracefully
10. WHEN navigating between integrations routes THEN transitions are smooth

---

## Non-Functional Requirements

### Performance

1. Page initial load should complete within 2 seconds on 3G connection
2. Provider and connection data should be cached to minimize API calls
3. Components should be lazy-loaded to reduce initial bundle size
4. Optimistic updates should make mutations feel instantaneous
5. Images and icons should be optimized for web delivery

### Security

1. OAuth state tokens must be validated to prevent CSRF attacks
2. Access tokens must never be exposed in the frontend UI
3. API calls must include authentication headers
4. Sensitive data must not be logged to the console in production
5. The callback page must validate all URL parameters

### Accessibility

1. All interactive elements must be keyboard accessible
2. Color contrast must meet WCAG AA standards (4.5:1 for text)
3. All images must have appropriate alt text or be marked decorative
4. Focus management must be properly handled for dialogs
5. Screen reader announcements must be provided for dynamic content

### Browser Support

1. Chrome, Firefox, Safari, Edge (latest 2 versions)
2. Mobile Safari and Chrome on iOS and Android
3. Responsive design from 320px to 2560px viewport width

### Code Quality

1. All components must be written in TypeScript with strict mode
2. All components must have proper prop type definitions
3. React Query hooks must be used for all data fetching
4. Code must pass ESLint without warnings
5. File and component naming must follow existing conventions

---

## Out of Scope

The following features are explicitly NOT included in this implementation:

1. **Backend OAuth Implementation** - Already implemented, this spec is frontend only
2. **Token Refresh API** - Backend handles automatic refresh, no manual UI needed
3. **Webhook Notifications** - No real-time push notifications for token expiry
4. **Analytics Dashboard** - No usage statistics for connections
5. **Bulk Operations** - No multi-select for deleting multiple connections
6. **Connection Sharing** - Connections are user-specific, no sharing between users
7. **Custom Scopes UI** - Users cannot customize OAuth scopes (uses defaults)
8. **Provider Ordering** - Providers display in fixed order, no user customization
9. **Connection Export** - No ability to export connection data
10. **Advanced Filtering** - No search or filter within connections list

---

## Success Metrics

The implementation will be considered successful when:

1. **Functionality**: All 22 requirements pass their acceptance criteria
2. **Navigation**: Users can access Integrations from sidebar and navigate to all pages
3. **OAuth Flow**: Users can successfully connect Google accounts via new tab flow
4. **Connection Management**: Users can view, rename, test, and disconnect connections
5. **Coming Soon**: Microsoft, Slack, Notion appear as "Coming Soon" placeholders
6. **Responsive**: UI works correctly on mobile, tablet, and desktop viewports
7. **Accessibility**: UI is navigable via keyboard with proper screen reader support
8. **Performance**: Page loads within 2 seconds, mutations feel instant
9. **Error Handling**: All error cases show user-friendly messages
10. **Code Quality**: TypeScript compiles without errors, ESLint passes

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-27
**Status:** Draft - Ready for Implementation
