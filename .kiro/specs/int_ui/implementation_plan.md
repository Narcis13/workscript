# Implementation Plan: Integrations UI

This document provides a concrete, actionable implementation plan for the Integrations UI feature. Tasks are organized by phases and include checkboxes for tracking progress. Each task is linked to specific requirements for traceability.

---

## PHASE 1: FOUNDATION & TYPES

### 1.1 Type Definitions

- [x] **Task 1.1.1: Create integration types file**
  - Create file: `apps/frontend/src/types/integration.types.ts`
  - Define `ProviderMetadata` interface with id, name, version, defaultScopes, supportsPKCE, supportsRefresh
  - _Requirements: 18_

- [x] **Task 1.1.2: Define ConnectionSummary type**
  - Add `ConnectionSummary` interface with id, name, provider, accountEmail, accountName, isActive, expiresAt, lastUsedAt, createdAt, lastError
  - Use union types for date fields: `Date | string | null`
  - _Requirements: 18_

- [x] **Task 1.1.3: Define TestConnectionResult type**
  - Add `TestConnectionResult` interface with valid boolean and optional error string
  - _Requirements: 18_

- [x] **Task 1.1.4: Define API response wrapper types**
  - Add `ProvidersResponse` with success, count, providers array
  - Add `ConnectionsResponse` with success, count, connections array
  - Add `ConnectionResponse` with success, connection object
  - Add `TestConnectionResponse` with success, result object
  - _Requirements: 18_

- [x] **Task 1.1.5: Define OAuthInitiateParams type**
  - Add `OAuthInitiateParams` with optional userId, tenantId, redirect fields
  - Export all types from the module
  - _Requirements: 18_

### 1.2 Provider UI Configuration

- [x] **Task 1.2.1: Create provider config file**
  - Create file: `apps/frontend/src/lib/providerConfig.tsx`
  - Define `ProviderUIConfig` interface with name, description, icon, brandColor, isAvailable, comingSoon
  - _Requirements: 19_

- [x] **Task 1.2.2: Add Google provider configuration**
  - Add Google config with name "Google", description, brand color #4285F4
  - Set isAvailable: true, comingSoon: false
  - _Requirements: 19_

- [x] **Task 1.2.3: Add Coming Soon provider configurations**
  - Add Microsoft config: name, description, brandColor #00A4EF, isAvailable: false, comingSoon: true
  - Add Slack config: name, description, brandColor #4A154B, isAvailable: false, comingSoon: true
  - Add Notion config: name, description, brandColor #000000, isAvailable: false, comingSoon: true
  - _Requirements: 19_

- [x] **Task 1.2.4: Create provider icon components**
  - Create inline SVG component for Google icon
  - Create inline SVG component for Microsoft icon
  - Create inline SVG component for Slack icon
  - Create inline SVG component for Notion icon
  - _Requirements: 19_

- [x] **Task 1.2.5: Create getProviderConfig helper function**
  - Export function that returns config by provider ID
  - Return default config for unknown providers
  - _Requirements: 19_

---

## PHASE 2: API SERVICE LAYER

### 2.1 API Service Functions

- [x] **Task 2.1.1: Create integrations API service file**
  - Create file: `apps/frontend/src/services/api/integrations.api.ts`
  - Import apiClient from existing client
  - Import types from integration.types
  - _Requirements: 16_

- [x] **Task 2.1.2: Implement fetchProviders function**
  - Create async function fetchProviders(): Promise<ProviderMetadata[]>
  - Call GET /integrations/oauth/providers
  - Parse and return providers array
  - _Requirements: 16_

- [x] **Task 2.1.3: Implement fetchConnections function**
  - Create async function fetchConnections(provider?: string): Promise<ConnectionSummary[]>
  - Call GET /integrations/connections with optional provider query param
  - Parse and return connections array
  - _Requirements: 16_

- [x] **Task 2.1.4: Implement fetchConnection function**
  - Create async function fetchConnection(id: string): Promise<ConnectionSummary>
  - Call GET /integrations/connections/:id
  - Parse and return connection object
  - _Requirements: 16_

- [x] **Task 2.1.5: Implement renameConnection function**
  - Create async function renameConnection(id: string, name: string): Promise<ConnectionSummary>
  - Call POST /integrations/connections/:id/rename with { name } body
  - Parse and return updated connection
  - _Requirements: 16_

- [x] **Task 2.1.6: Implement deleteConnection function**
  - Create async function deleteConnection(id: string): Promise<void>
  - Call DELETE /integrations/connections/:id
  - Return void on success
  - _Requirements: 16_

- [x] **Task 2.1.7: Implement testConnection function**
  - Create async function testConnection(id: string): Promise<TestConnectionResult>
  - Call POST /integrations/connections/:id/test
  - Parse and return result object
  - _Requirements: 16_

- [x] **Task 2.1.8: Implement getOAuthAuthUrl function**
  - Create function getOAuthAuthUrl(providerId: string, params?: OAuthInitiateParams): string
  - Build URL with base path /integrations/oauth/:provider/auth
  - Append query params if provided
  - Return constructed URL string
  - _Requirements: 16_

- [x] **Task 2.1.9: Export all API functions**
  - Create barrel export in the file
  - Ensure all functions are named exports
  - _Requirements: 16_

---

## PHASE 3: REACT QUERY HOOKS

### 3.1 Query Key Structure

- [x] **Task 3.1.1: Create integrations hooks file**
  - Create file: `apps/frontend/src/hooks/api/useIntegrations.ts`
  - Import useQuery, useMutation, useQueryClient from @tanstack/react-query
  - Import toast from sonner
  - Import API functions and types
  - _Requirements: 17_

- [x] **Task 3.1.2: Define query key factory**
  - Create integrationKeys object with:
    - all: ['integrations']
    - providers: () => [...all, 'providers']
    - connections: () => [...all, 'connections']
    - connectionsByProvider: (provider?) => [...connections, { provider }]
    - connection: (id) => [...connections, id]
  - _Requirements: 17_

### 3.2 Query Hooks

- [x] **Task 3.2.1: Implement useProviders hook**
  - Create useProviders() hook using useQuery
  - Set queryKey to integrationKeys.providers()
  - Set staleTime to 30 minutes (30 * 60 * 1000)
  - Enable refetchOnMount
  - _Requirements: 17_

- [x] **Task 3.2.2: Implement useConnections hook**
  - Create useConnections(provider?: string) hook using useQuery
  - Set queryKey to integrationKeys.connectionsByProvider(provider)
  - Set staleTime to 2 minutes (2 * 60 * 1000)
  - Enable refetchOnMount and refetchOnWindowFocus
  - _Requirements: 17_

- [x] **Task 3.2.3: Implement useConnection hook**
  - Create useConnection(id?: string) hook using useQuery
  - Set enabled: !!id
  - Set staleTime to 2 minutes
  - _Requirements: 17_

### 3.3 Mutation Hooks

- [x] **Task 3.3.1: Implement useRenameConnection hook**
  - Create useRenameConnection() hook using useMutation
  - Set mutationFn to call renameConnection API
  - On success: update cache, invalidate connections, show success toast
  - On error: show error toast with API message
  - _Requirements: 17_

- [x] **Task 3.3.2: Implement useDeleteConnection hook**
  - Create useDeleteConnection() hook using useMutation
  - Implement optimistic update in onMutate
  - Cancel outgoing queries, save previous state
  - Remove connection from cache optimistically
  - On success: invalidate connections, show success toast
  - On error: rollback cache, show error toast
  - _Requirements: 17_

- [x] **Task 3.3.3: Implement useTestConnection hook**
  - Create useTestConnection() hook using useMutation
  - Set mutationFn to call testConnection API
  - On success: show toast based on valid/invalid result
  - Invalidate connection queries to refresh status
  - On error: show error toast
  - _Requirements: 17_

- [x] **Task 3.3.4: Export all hooks**
  - Create named exports for all hooks
  - Export integrationKeys for external use if needed
  - _Requirements: 17_

---

## PHASE 4: UI COMPONENTS - PROVIDER CARDS

### 4.1 Provider Card Component

- [x] **Task 4.1.1: Create integrations components directory**
  - Create directory: `apps/frontend/src/components/integrations/`
  - Create barrel export file: `apps/frontend/src/components/integrations/index.ts`
  - _Requirements: 2, 3_

- [x] **Task 4.1.2: Create ProviderCard component file**
  - Create file: `apps/frontend/src/components/integrations/ProviderCard.tsx`
  - Define ProviderCardProps interface with provider, connectionCount, onConnect, connecting?, className?
  - _Requirements: 3_

- [x] **Task 4.1.3: Implement ProviderCard layout**
  - Import Card, CardHeader, CardContent, CardFooter from @/components/ui/card
  - Import Button, Badge from shadcn/ui
  - Import getProviderConfig from lib/providerConfig
  - Render Card with hover:shadow-lg transition
  - _Requirements: 3_

- [x] **Task 4.1.4: Implement ProviderCard header section**
  - Display provider icon (40x40 with rounded corners)
  - Display provider name as CardTitle
  - Display provider description as CardDescription
  - Show connection count badge if connectionCount > 0
  - _Requirements: 3_

- [x] **Task 4.1.5: Implement ProviderCard Connect button**
  - Add Button in CardFooter with full width
  - Display "Connect [Provider Name] Account" text
  - Show Loader2 spinner when connecting
  - Show Plus icon when not connecting
  - Call onConnect(provider.id) on click
  - _Requirements: 3_

- [x] **Task 4.1.6: Implement Coming Soon variant**
  - Check isAvailable and comingSoon from provider config
  - Apply muted/opacity styling for coming soon cards
  - Replace connection count badge with "Coming Soon" badge
  - Disable Connect button for coming soon providers
  - _Requirements: 3_

- [x] **Task 4.1.7: Add hover and focus states**
  - Add hover:shadow-lg transition-shadow class
  - Add focus-visible ring for keyboard navigation
  - Add cursor-not-allowed for coming soon cards
  - _Requirements: 3, 21_

### 4.2 Provider Card Skeleton

- [x] **Task 4.2.1: Create ProviderCardSkeleton component**
  - Create file: `apps/frontend/src/components/integrations/ProviderCardSkeleton.tsx`
  - Import Card and Skeleton from shadcn/ui
  - Match dimensions of ProviderCard
  - _Requirements: 14_

- [x] **Task 4.2.2: Implement skeleton layout**
  - Add Skeleton for icon (40x40 rounded)
  - Add Skeleton for title (h-5 w-24)
  - Add Skeleton for description (h-4 w-full and h-4 w-3/4)
  - Add Skeleton for button (h-10 w-full)
  - Use animate-pulse class
  - _Requirements: 14_

---

## PHASE 5: UI COMPONENTS - CONNECTION CARDS

### 5.1 Connection Status Logic

- [x] **Task 5.1.1: Create connection status utility**
  - Create file or add to: `apps/frontend/src/lib/connectionUtils.ts`
  - Define ConnectionStatus type with status, label, variant fields
  - _Requirements: 8_

- [x] **Task 5.1.2: Implement getConnectionStatus function**
  - Check isActive === false → return 'Needs Re-auth', destructive
  - Check expiresAt null → return 'Active', default
  - Check expiresAt past → return 'Expired', destructive
  - Check expiresAt within 24 hours → return 'Expiring Soon', secondary
  - Default → return 'Active', default
  - _Requirements: 8_

- [x] **Task 5.1.3: Implement relative time formatting**
  - Create formatRelativeTime function using date-fns
  - Handle null/undefined dates with "Never used" fallback
  - Format dates like "2 hours ago", "3 days ago"
  - _Requirements: 7_

### 5.2 Connection Card Component

- [x] **Task 5.2.1: Create ConnectionCard component file**
  - Create file: `apps/frontend/src/components/integrations/ConnectionCard.tsx`
  - Define ConnectionCardProps interface with connection, onRename, onTest, onDisconnect, onReauth, testing?, className?
  - _Requirements: 7_

- [x] **Task 5.2.2: Implement ConnectionCard layout**
  - Import Card, Badge, Button, DropdownMenu from shadcn/ui
  - Import getProviderConfig from lib/providerConfig
  - Import getConnectionStatus from connectionUtils
  - Render Card with appropriate styling
  - _Requirements: 7_

- [x] **Task 5.2.3: Implement ConnectionCard header**
  - Display provider icon (smaller, 24x24)
  - Display account email prominently
  - Display connection name (user-defined label) if different from email
  - Display status badge with appropriate variant
  - _Requirements: 7_

- [x] **Task 5.2.4: Implement ConnectionCard metadata**
  - Display account name from provider if available
  - Display "Last used: [relative time]" or "Never used"
  - Display "Created: [formatted date]"
  - _Requirements: 7_

- [x] **Task 5.2.5: Implement inactive connection warning**
  - Check if status is 'Needs Re-auth' or 'Expired'
  - Display Alert banner with warning message
  - Add prominent "Reconnect" button inside banner
  - _Requirements: 7, 12_

- [x] **Task 5.2.6: Implement actions dropdown menu**
  - Add DropdownMenu with MoreVertical (⋮) trigger button
  - Add menu items: Rename, Test, Disconnect
  - Add icons for each menu item (Pencil, TestTube, Unlink)
  - Style Disconnect as destructive
  - _Requirements: 7_

- [x] **Task 5.2.7: Connect action handlers**
  - Call onRename(connection.id) when Rename clicked
  - Call onTest(connection.id) when Test clicked
  - Call onDisconnect(connection.id) when Disconnect clicked
  - Call onReauth(connection.id, connection.provider) when Reconnect clicked
  - Show loading state on Test item when testing prop is true
  - _Requirements: 9, 10, 11, 12_

### 5.3 Connection Card Skeleton

- [x] **Task 5.3.1: Create ConnectionCardSkeleton component**
  - Create file: `apps/frontend/src/components/integrations/ConnectionCardSkeleton.tsx`
  - Match dimensions of ConnectionCard
  - _Requirements: 14_

- [x] **Task 5.3.2: Implement skeleton layout**
  - Add Skeleton for provider icon (24x24)
  - Add Skeleton for email (h-5 w-48)
  - Add Skeleton for name (h-4 w-32)
  - Add Skeleton for metadata lines (h-3 w-24)
  - Add Skeleton for badge (h-5 w-16)
  - Use animate-pulse class
  - _Requirements: 14_

---

## PHASE 6: UI COMPONENTS - DIALOGS

### 6.1 Rename Connection Dialog

- [x] **Task 6.1.1: Create RenameConnectionDialog component**
  - Create file: `apps/frontend/src/components/integrations/RenameConnectionDialog.tsx`
  - Define props: open, onOpenChange, connection, onRename, loading?
  - _Requirements: 9_

- [x] **Task 6.1.2: Implement dialog structure**
  - Import Dialog components from shadcn/ui
  - Import Input, Button, Label from shadcn/ui
  - Use controlled open state via props
  - _Requirements: 9_

- [x] **Task 6.1.3: Implement rename form**
  - Add input field for new name
  - Pre-fill with connection.name or connection.accountEmail
  - Add character counter (max 100 characters)
  - Validate: required, min 1 char, max 100 chars
  - _Requirements: 9_

- [x] **Task 6.1.4: Implement dialog actions**
  - Add Cancel button that calls onOpenChange(false)
  - Add Save button that calls onRename(connection.id, newName)
  - Disable Save when name is invalid or unchanged
  - Show loading spinner on Save when loading is true
  - _Requirements: 9_

- [x] **Task 6.1.5: Handle focus management**
  - Auto-focus input when dialog opens
  - Select all text for easy replacement
  - Return focus to trigger on close
  - _Requirements: 9, 21_

### 6.2 Disconnect Confirmation Dialog

- [x] **Task 6.2.1: Create DisconnectConfirmDialog component**
  - Create file: `apps/frontend/src/components/integrations/DisconnectConfirmDialog.tsx`
  - Define props: open, onOpenChange, connection, onConfirm, loading?
  - _Requirements: 11_

- [x] **Task 6.2.2: Implement dialog structure**
  - Import AlertDialog components from shadcn/ui
  - Display warning icon
  - Display title "Disconnect Account?"
  - _Requirements: 11_

- [x] **Task 6.2.3: Implement confirmation content**
  - Display connection name or email being disconnected
  - Add warning text about workflow impact
  - Example: "Workflows using this connection will no longer work."
  - _Requirements: 11_

- [x] **Task 6.2.4: Implement dialog actions**
  - Add Cancel button with outline variant
  - Add Disconnect button with destructive variant
  - Show loading spinner on Disconnect when loading
  - _Requirements: 11_

---

## PHASE 7: MAIN PAGE IMPLEMENTATION

### 7.1 Integrations Page Structure

- [x] **Task 7.1.1: Create IntegrationsPage file**
  - Create file: `apps/frontend/src/pages/integrations/IntegrationsPage.tsx`
  - Import all necessary components and hooks
  - _Requirements: 1, 2, 6_

- [x] **Task 7.1.2: Implement component state**
  - Add state for renameConnection dialog (connection or null)
  - Add state for deleteConnection dialog (connection or null)
  - Add state for testingId (connection ID or null)
  - _Requirements: 9, 10, 11_

- [x] **Task 7.1.3: Setup data fetching**
  - Call useProviders() hook
  - Call useConnections() hook
  - Get mutation hooks: useRenameConnection, useDeleteConnection, useTestConnection
  - _Requirements: 2, 6_

- [x] **Task 7.1.4: Compute derived data**
  - Create connectionsByProvider memoized grouping
  - Create getConnectionCount helper function
  - _Requirements: 6_

### 7.2 Page Layout

- [x] **Task 7.2.1: Implement page header**
  - Add container with mx-auto py-6 space-y-6
  - Add PageHeader with title "Integrations"
  - Add description "Connect third-party services to your workflows"
  - _Requirements: 1_

- [x] **Task 7.2.2: Implement loading state**
  - Check if providers or connections are loading
  - Render skeleton sections for both providers and connections
  - Use ProviderCardSkeleton (3-4 items)
  - Use ConnectionCardSkeleton (2-3 items)
  - _Requirements: 14_

- [x] **Task 7.2.3: Implement error state**
  - Check for provider or connection errors
  - Render error alert with icon and message
  - Add "Retry" button that triggers refetch
  - _Requirements: 15_

### 7.3 Available Providers Section

- [x] **Task 7.3.1: Implement section header**
  - Add section element
  - Add h2 "Available Providers" with text-lg font-semibold mb-4
  - _Requirements: 2_

- [x] **Task 7.3.2: Implement provider grid**
  - Add grid container with responsive columns
  - gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  - _Requirements: 2, 20_

- [x] **Task 7.3.3: Render provider cards**
  - Map over providers from API
  - Also include coming-soon providers from config
  - Render ProviderCard for each
  - Pass connectionCount from derived data
  - _Requirements: 2, 3_

- [x] **Task 7.3.4: Implement connect handler**
  - Create handleConnect(providerId) function
  - Build OAuth auth URL using getOAuthAuthUrl
  - Include redirect to callback page
  - Open URL in new tab using window.open()
  - _Requirements: 4_

### 7.4 My Connections Section

- [x] **Task 7.4.1: Implement section with separator**
  - Add Separator component between sections
  - Add section element for My Connections
  - Add h2 "My Connections" with styling
  - _Requirements: 6_

- [x] **Task 7.4.2: Implement empty state**
  - Check if connections array is empty
  - Render EmptyState component with Plug icon
  - Add title "No connections yet"
  - Add description encouraging first connection
  - _Requirements: 13_

- [x] **Task 7.4.3: Implement grouped connections display**
  - Map over providers that have connections
  - For each provider group, render section
  - Add h3 with provider name and count
  - Render connection grid below header
  - _Requirements: 6_

- [x] **Task 7.4.4: Render connection cards**
  - Map over provider's connections
  - Render ConnectionCard for each
  - Pass all action handlers
  - Pass testing state for testingId match
  - _Requirements: 7_

### 7.5 Action Handlers

- [x] **Task 7.5.1: Implement rename handler**
  - Create handleRename(id, name) function
  - Call renameMutation.mutate
  - On success, close dialog via setRenameConnection(null)
  - _Requirements: 9_

- [x] **Task 7.5.2: Implement test handler**
  - Create handleTest(id) function
  - Set testingId state
  - Call testMutation.mutate
  - On settled, clear testingId
  - _Requirements: 10_

- [x] **Task 7.5.3: Implement disconnect handler**
  - Create handleDelete() function
  - Get id from deleteConnection state
  - Call deleteMutation.mutate
  - On success, close dialog
  - _Requirements: 11_

- [x] **Task 7.5.4: Implement reauth handler**
  - Create handleReauth(id, provider) function
  - Call handleConnect(provider) to initiate OAuth
  - _Requirements: 12_

### 7.6 Dialogs Integration

- [x] **Task 7.6.1: Add RenameConnectionDialog**
  - Render at bottom of component
  - Control open state with !!renameConnection
  - Pass connection, onRename, loading from mutation
  - _Requirements: 9_

- [x] **Task 7.6.2: Add DisconnectConfirmDialog**
  - Render at bottom of component
  - Control open state with !!deleteConnection
  - Pass connection, onConfirm, loading from mutation
  - _Requirements: 11_

---

## PHASE 8: OAUTH CALLBACK PAGE

### 8.1 Callback Page Implementation

- [x] **Task 8.1.1: Create OAuthCallbackPage file**
  - Create file: `apps/frontend/src/pages/integrations/OAuthCallbackPage.tsx`
  - _Requirements: 5_

- [x] **Task 8.1.2: Parse URL parameters**
  - Use useSearchParams or useLocation hook
  - Extract success, error, connectionId, provider parameters
  - _Requirements: 5_

- [x] **Task 8.1.3: Implement success state UI**
  - Display large CheckCircle icon in green
  - Display "Connection Successful!" heading
  - Display connected email if available
  - Display provider name in message
  - _Requirements: 5_

- [x] **Task 8.1.4: Implement close tab instruction**
  - Add text "You can now close this tab and return to your application"
  - Style as muted, smaller text
  - Center align the entire content
  - _Requirements: 5_

- [x] **Task 8.1.5: Implement error state UI**
  - Display large XCircle or AlertTriangle icon in red
  - Display "Connection Failed" heading
  - Display error message from URL params
  - _Requirements: 5_

- [x] **Task 8.1.6: Implement retry button for errors**
  - Add "Try Again" button for error state
  - On click, redirect back to /integrations page
  - Or re-initiate OAuth flow if provider is known
  - _Requirements: 5_

- [x] **Task 8.1.7: Implement invalid callback state**
  - Check if neither success nor error param exists
  - Display "Invalid Callback" message
  - Provide link back to Integrations page
  - _Requirements: 5_

- [x] **Task 8.1.8: Style callback page**
  - Use minimal layout (no sidebar/header)
  - Center content vertically and horizontally
  - Use consistent app theming
  - Support dark mode
  - _Requirements: 5_

---

## PHASE 9: ROUTING & NAVIGATION

### 9.1 Route Configuration

- [x] **Task 9.1.1: Add lazy imports to routes**
  - Open `apps/frontend/src/routes.tsx`
  - Add lazy import for IntegrationsPage
  - Add lazy import for OAuthCallbackPage
  - _Requirements: 22_

- [x] **Task 9.1.2: Add integrations route**
  - Add route object with path: 'integrations'
  - Wrap element with RouteErrorBoundary
  - Set fallbackPath to '/dashboard'
  - _Requirements: 22_

- [x] **Task 9.1.3: Add OAuth callback route**
  - Add route object with path: 'integrations/oauth/callback'
  - Consider if it should be outside AppLayout (minimal page)
  - Wrap with RouteErrorBoundary
  - _Requirements: 22_

### 9.2 Sidebar Navigation

- [x] **Task 9.2.1: Import Plug icon**
  - Open `apps/frontend/src/components/layout/Sidebar.tsx`
  - Import { Plug } from 'lucide-react'
  - _Requirements: 1_

- [x] **Task 9.2.2: Add Integrations navigation item**
  - Add to navigationLinks array
  - Set href: '/integrations'
  - Set label: 'Integrations'
  - Set icon: Plug
  - Position after Monitoring or as appropriate
  - _Requirements: 1_

---

## PHASE 10: BARREL EXPORTS & CLEANUP

### 10.1 Component Exports

- [x] **Task 10.1.1: Update integrations components index**
  - Open `apps/frontend/src/components/integrations/index.ts`
  - Export ProviderCard and ProviderCardSkeleton
  - Export ConnectionCard and ConnectionCardSkeleton
  - Export RenameConnectionDialog
  - Export DisconnectConfirmDialog
  - _Requirements: All component requirements_

### 10.2 Hook Exports

- [x] **Task 10.2.1: Add useIntegrations to hooks index**
  - Check if `apps/frontend/src/hooks/api/index.ts` exists
  - Add export for useIntegrations hooks
  - Or export directly from useIntegrations file
  - _Requirements: 17_

### 10.3 Type Exports

- [x] **Task 10.3.1: Add integration types to types index**
  - Check if `apps/frontend/src/types/index.ts` exists
  - Add export for integration.types
  - Or ensure types are importable directly
  - _Requirements: 18_

---

## PHASE 11: RESPONSIVE & ACCESSIBILITY

### 11.1 Responsive Testing

- [x] **Task 11.1.1: Test mobile layout (< 640px)**
  - Verify single column for provider cards
  - Verify single column for connection cards
  - Verify dialogs are full-width with padding
  - Verify no horizontal overflow
  - _Requirements: 20_

- [x] **Task 11.1.2: Test tablet layout (640-1024px)**
  - Verify 2-column provider grid
  - Verify 1-column connection grid
  - Verify sidebar behavior
  - _Requirements: 20_

- [x] **Task 11.1.3: Test desktop layout (> 1024px)**
  - Verify 3-column provider grid
  - Verify 2-column connection grid
  - Verify sidebar is visible
  - _Requirements: 20_

### 11.2 Accessibility Testing

- [x] **Task 11.2.1: Test keyboard navigation**
  - Verify Tab reaches all interactive elements
  - Verify Enter/Space activates buttons
  - Verify Escape closes dialogs
  - Verify arrow keys navigate dropdowns
  - _Requirements: 21_

- [x] **Task 11.2.2: Add ARIA labels**
  - Add aria-label to icon-only buttons
  - Add aria-describedby to form inputs
  - Add aria-live for dynamic status updates
  - _Requirements: 21_

- [x] **Task 11.2.3: Test focus management**
  - Verify focus moves to dialog content on open
  - Verify focus returns to trigger on close
  - Verify visible focus rings on all elements
  - _Requirements: 21_

- [x] **Task 11.2.4: Test screen reader**
  - Verify status badges are announced
  - Verify toast notifications are announced
  - Verify loading states are announced
  - _Requirements: 21_

---

## PHASE 12: ERROR HANDLING & EDGE CASES

### 12.1 Error Handling

- [x] **Task 12.1.1: Implement API error handling**
  - Ensure all API calls catch and handle errors
  - Display user-friendly messages from error responses
  - Use fallback messages for unknown errors
  - _Requirements: 15_

- [x] **Task 12.1.2: Implement network error handling**
  - Detect network connectivity issues
  - Display "Unable to connect" message
  - Provide retry functionality
  - _Requirements: 15_

- [x] **Task 12.1.3: Test error boundary coverage**
  - Verify RouteErrorBoundary catches page errors
  - Verify error UI is user-friendly
  - Verify navigation back is possible
  - _Requirements: 15_

### 12.2 Edge Cases

- [x] **Task 12.2.1: Handle empty provider list**
  - Verify graceful handling if API returns empty providers
  - Show appropriate message
  - _Requirements: 2_

- [x] **Task 12.2.2: Handle very long connection names**
  - Verify text truncation with ellipsis
  - Verify tooltips for full text on hover
  - _Requirements: 7_

- [x] **Task 12.2.3: Handle many connections**
  - Verify layout doesn't break with 10+ connections
  - Consider pagination if needed (out of scope flag)
  - _Requirements: 6_

---

## PHASE 13: FINAL VERIFICATION

### 13.1 Build & Type Check

- [x] **Task 13.1.1: Run TypeScript type check**
  - Execute: `cd apps/frontend && npx tsc --noEmit`
  - Fix any type errors
  - Ensure no implicit any usage
  - _Requirements: Non-functional - Code Quality_

- [x] **Task 13.1.2: Run ESLint**
  - Execute: `bun run lint` or `cd apps/frontend && npx eslint src`
  - Fix any linting errors or warnings
  - _Requirements: Non-functional - Code Quality_

- [x] **Task 13.1.3: Test production build**
  - Execute: `cd apps/frontend && bun run build`
  - Verify build completes without errors
  - Verify bundle size is reasonable
  - _Requirements: Non-functional - Performance_

### 13.2 Integration Testing

- [ ] **Task 13.2.1: Test full OAuth flow**
  - Click Connect on Google provider
  - Verify new tab opens with OAuth URL
  - Complete authentication (requires real Google account)
  - Verify callback page shows success
  - Verify connection appears in list after refresh
  - _Requirements: 4, 5_

- [ ] **Task 13.2.2: Test connection management**
  - Rename a connection and verify update
  - Test a connection and verify toast
  - Disconnect a connection and verify removal
  - _Requirements: 9, 10, 11_

- [ ] **Task 13.2.3: Test error scenarios**
  - Simulate API errors (network tab throttling)
  - Verify error messages appear
  - Verify retry functionality works
  - _Requirements: 15_

### 13.3 Final Acceptance

- [ ] **Task 13.3.1: Review all requirements**
  - Go through each requirement (1-22)
  - Verify all acceptance criteria are met
  - Document any deviations or known issues
  - _Requirements: All_

- [ ] **Task 13.3.2: Cross-browser testing**
  - Test in Chrome, Firefox, Safari
  - Verify consistent appearance and behavior
  - _Requirements: Non-functional - Browser Support_

- [ ] **Task 13.3.3: Mobile device testing**
  - Test on actual iOS device or simulator
  - Test on actual Android device or simulator
  - Verify touch interactions work correctly
  - _Requirements: 20_

---

## Summary

**Total Tasks:** 118
**Estimated Time:** 4-6 days

**Critical Path:**
1. Phase 1: Foundation & Types (0.5 days)
2. Phase 2: API Service Layer (0.5 days)
3. Phase 3: React Query Hooks (0.5 days)
4. Phase 4: Provider Card Components (0.5 days)
5. Phase 5: Connection Card Components (0.5 days)
6. Phase 6: Dialog Components (0.5 days)
7. Phase 7: Main Page Implementation (1 day)
8. Phase 8: OAuth Callback Page (0.5 days)
9. Phase 9: Routing & Navigation (0.25 days)
10. Phase 10: Barrel Exports (0.25 days)
11. Phase 11: Responsive & Accessibility (0.5 days)
12. Phase 12: Error Handling (0.25 days)
13. Phase 13: Final Verification (0.5 days)

**Key Milestones:**
- ✅ Foundation complete (Types, API, Hooks)
- ✅ Provider cards rendering with Connect functionality
- ✅ Connection cards rendering with status display
- ✅ All dialogs functional (Rename, Disconnect)
- ✅ Main page fully operational
- ✅ OAuth flow working end-to-end
- ✅ All accessibility requirements met
- ✅ Production build successful

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-27
**Status:** Ready for Implementation
