/**
 * ConnectionCard Component
 *
 * Displays an OAuth connection's information in a card format.
 * Shows the provider icon, account email, name, status badge, metadata,
 * and action buttons for managing the connection.
 *
 * Features:
 * - Provider icon and account information
 * - Status badge indicating connection health (Active, Expiring Soon, Needs Re-auth)
 * - Last used and created timestamps
 * - Warning banner for inactive connections with Reconnect button
 * - Actions dropdown menu (Rename, Test, Disconnect)
 * - Hover and focus states for accessibility
 * - Text truncation with tooltips for long names (emails, custom names, account names)
 *
 * Requirements Coverage:
 * - Requirement 7: Connection Card Component
 * - Requirement 8: Connection Status Logic
 * - Requirement 12: Connection Actions - Reconnect
 * - Requirement 21: Accessibility
 *
 * @module components/integrations/ConnectionCard
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MoreVertical,
  Pencil,
  TestTube2,
  Unlink,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Clock,
  Calendar,
} from 'lucide-react';
import { getProviderConfig } from '@/lib/providerConfig';
import {
  getConnectionStatus,
  formatRelativeTime,
  formatDate,
  connectionRequiresReauth,
} from '@/lib/connectionUtils';
import type { ConnectionSummary } from '@/types/integration.types';
import { cn } from '@/lib/utils';

/**
 * Props for the ConnectionCard component
 */
export interface ConnectionCardProps {
  /**
   * The connection data to display
   */
  connection: ConnectionSummary;

  /**
   * Callback when the Rename action is clicked
   * @param connectionId - The ID of the connection to rename
   */
  onRename?: (connectionId: string) => void;

  /**
   * Callback when the Test action is clicked
   * @param connectionId - The ID of the connection to test
   */
  onTest?: (connectionId: string) => void;

  /**
   * Callback when the Disconnect action is clicked
   * @param connectionId - The ID of the connection to disconnect
   */
  onDisconnect?: (connectionId: string) => void;

  /**
   * Callback when the Reconnect/Re-auth action is clicked
   * @param connectionId - The ID of the connection to reconnect
   * @param providerId - The provider ID for the OAuth flow
   */
  onReauth?: (connectionId: string, providerId: string) => void;

  /**
   * Whether the connection is currently being tested
   */
  testing?: boolean;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * ConnectionCard Component
 *
 * Displays a single OAuth connection with status, metadata, and actions.
 *
 * @example
 * ```tsx
 * <ConnectionCard
 *   connection={connection}
 *   onRename={(id) => openRenameDialog(id)}
 *   onTest={(id) => testConnection(id)}
 *   onDisconnect={(id) => confirmDisconnect(id)}
 *   onReauth={(id, provider) => initiateOAuth(provider)}
 *   testing={testingId === connection.id}
 * />
 * ```
 */
export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onRename,
  onTest,
  onDisconnect,
  onReauth,
  testing = false,
  className,
}) => {
  // Get UI configuration for the provider
  const providerConfig = getProviderConfig(connection.provider);
  const Icon = providerConfig.icon;

  // Compute connection status
  const statusInfo = getConnectionStatus(connection);
  const needsReauth = connectionRequiresReauth(connection);

  /**
   * Handle Rename action
   */
  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRename?.(connection.id);
  };

  /**
   * Handle Test action
   */
  const handleTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!testing) {
      onTest?.(connection.id);
    }
  };

  /**
   * Handle Disconnect action
   */
  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDisconnect?.(connection.id);
  };

  /**
   * Handle Reconnect/Re-auth action
   */
  const handleReauth = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReauth?.(connection.id, connection.provider);
  };

  /**
   * Get the display name for the connection
   * Prioritize user-defined name, fallback to account name or email
   */
  const displayName = connection.name || connection.accountName || connection.accountEmail || 'Unnamed Connection';

  /**
   * Determine if we should show the custom name
   * Only show if it's different from the email
   */
  const showCustomName = connection.name && connection.name !== connection.accountEmail;

  /**
   * Get the badge variant based on status
   */
  const getBadgeVariant = (variant: string) => {
    switch (variant) {
      case 'destructive':
        return 'destructive';
      case 'secondary':
        return 'secondary';
      case 'outline':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        'hover:shadow-md hover:border-primary/30',
        needsReauth && 'border-destructive/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      tabIndex={0}
      aria-label={`${displayName} connection${needsReauth ? ' - needs re-authentication' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Left side: Icon and account info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Provider Icon */}
            <div
              className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${providerConfig.brandColor}15`,
              }}
            >
              <Icon
                className="h-5 w-5"
                aria-hidden="true"
              />
            </div>

            {/* Account Info */}
            <div className="min-w-0 flex-1">
              {/* Account Email (primary identifier) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <h4 className="font-medium text-sm leading-tight truncate cursor-default">
                    {connection.accountEmail || displayName}
                  </h4>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs break-all">
                  <p>{connection.accountEmail || displayName}</p>
                </TooltipContent>
              </Tooltip>

              {/* Custom Name (if different from email) */}
              {showCustomName && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 cursor-default">
                      {connection.name}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs break-all">
                    <p>{connection.name}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Account Name from provider (if available and different) */}
              {connection.accountName && connection.accountName !== connection.accountEmail && !showCustomName && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 cursor-default">
                      {connection.accountName}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs break-all">
                    <p>{connection.accountName}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Right side: Status badge and actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Badge */}
            <Badge
              variant={getBadgeVariant(statusInfo.variant)}
              className="text-xs whitespace-nowrap"
              role="status"
              aria-label={`Connection status: ${statusInfo.label}`}
            >
              {statusInfo.label}
            </Badge>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="Open connection actions menu"
                  aria-haspopup="menu"
                >
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleRename} aria-label="Rename connection">
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleTest} disabled={testing} aria-label={testing ? "Testing connection in progress" : "Test connection"}>
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      <span aria-live="polite">Testing...</span>
                    </>
                  ) : (
                    <>
                      <TestTube2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      Test
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDisconnect}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  aria-label="Disconnect this account"
                >
                  <Unlink className="mr-2 h-4 w-4" aria-hidden="true" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Warning banner for inactive connections */}
        {needsReauth && (
          <Alert variant="destructive" className="py-2 px-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs font-medium">Re-authentication Required</AlertTitle>
            <AlertDescription className="text-xs">
              <p className="mb-2">This connection has expired or been revoked.</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReauth}
                className="h-7 text-xs"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Reconnect
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {/* Last Used */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>
              Last used:{' '}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    {formatRelativeTime(connection.lastUsedAt)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {connection.lastUsedAt
                    ? formatDate(connection.lastUsedAt, 'MMM d, yyyy h:mm a')
                    : 'Never used'}
                </TooltipContent>
              </Tooltip>
            </span>
          </div>

          {/* Created */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            <span>
              Created:{' '}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    {formatDate(connection.createdAt)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {formatDate(connection.createdAt, 'MMM d, yyyy h:mm a')}
                </TooltipContent>
              </Tooltip>
            </span>
          </div>
        </div>

        {/* Last Error (if present) */}
        {connection.lastError && !needsReauth && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Last error occurred</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{connection.lastError}</p>
                {connection.lastErrorAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(connection.lastErrorAt)}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionCard;
