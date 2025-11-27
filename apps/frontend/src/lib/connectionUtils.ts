/**
 * Connection Utilities
 *
 * Utility functions for computing connection status and formatting
 * connection-related data for display in the UI.
 *
 * @module connectionUtils
 */

import { formatDistanceToNow, format, isValid, parseISO, differenceInHours, isPast } from 'date-fns';
import type { ConnectionSummary, ConnectionStatusInfo } from '@/types/integration.types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Hours before expiration to show "Expiring Soon" status
 */
const EXPIRING_SOON_HOURS = 24;

// =============================================================================
// STATUS COMPUTATION
// =============================================================================

/**
 * Get Connection Status
 *
 * Computes the display status of a connection based on its isActive flag
 * and token expiration time.
 *
 * Status Logic:
 * 1. If isActive is false → "Needs Re-auth" (destructive)
 * 2. If isActive is true and expiresAt is null → "Active" (default)
 * 3. If isActive is true and expiresAt is past → "Expired" (destructive)
 * 4. If isActive is true and expiresAt is within 24 hours → "Expiring Soon" (secondary/warning)
 * 5. If isActive is true and expiresAt is more than 24 hours away → "Active" (default)
 *
 * @param connection - The connection to get status for
 * @returns ConnectionStatusInfo with status, label, and variant
 *
 * @example
 * ```typescript
 * const connection = { isActive: true, expiresAt: null };
 * const status = getConnectionStatus(connection);
 * // { status: 'active', label: 'Active', variant: 'default' }
 *
 * const expiredConnection = { isActive: true, expiresAt: '2024-01-01T00:00:00Z' };
 * const expiredStatus = getConnectionStatus(expiredConnection);
 * // { status: 'expired', label: 'Expired', variant: 'destructive' }
 * ```
 */
export function getConnectionStatus(
  connection: Pick<ConnectionSummary, 'isActive' | 'expiresAt'>
): ConnectionStatusInfo {
  const { isActive, expiresAt } = connection;

  // Case 1: Connection is inactive (needs re-auth)
  if (!isActive) {
    return {
      status: 'needs_reauth',
      label: 'Needs Re-auth',
      variant: 'destructive',
    };
  }

  // Case 2: No expiration date - consider active
  if (!expiresAt) {
    return {
      status: 'active',
      label: 'Active',
      variant: 'default',
    };
  }

  // Parse the expiration date
  const expirationDate = parseDate(expiresAt);

  // If we can't parse the date, assume active
  if (!expirationDate) {
    return {
      status: 'active',
      label: 'Active',
      variant: 'default',
    };
  }

  // Case 3: Token has expired
  if (isPast(expirationDate)) {
    return {
      status: 'expired',
      label: 'Expired',
      variant: 'destructive',
    };
  }

  // Case 4: Token expires within 24 hours
  const hoursUntilExpiry = differenceInHours(expirationDate, new Date());
  if (hoursUntilExpiry <= EXPIRING_SOON_HOURS) {
    return {
      status: 'expiring_soon',
      label: 'Expiring Soon',
      variant: 'secondary',
    };
  }

  // Case 5: Token is valid and not expiring soon
  return {
    status: 'active',
    label: 'Active',
    variant: 'default',
  };
}

/**
 * Check if a connection requires re-authentication
 *
 * A connection requires re-auth if:
 * - isActive is false
 * - Token has expired
 *
 * @param connection - The connection to check
 * @returns true if the connection needs re-authentication
 */
export function connectionRequiresReauth(
  connection: Pick<ConnectionSummary, 'isActive' | 'expiresAt'>
): boolean {
  const status = getConnectionStatus(connection);
  return status.status === 'needs_reauth' || status.status === 'expired';
}

// =============================================================================
// DATE FORMATTING
// =============================================================================

/**
 * Parse a date value that may be a Date, ISO string, or null
 *
 * @param value - The date value to parse
 * @returns Date object or null if invalid/null
 */
function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  }

  return null;
}

/**
 * Format Relative Time
 *
 * Formats a date as a relative time string (e.g., "2 hours ago", "3 days ago").
 * Returns "Never used" if the date is null/undefined.
 *
 * @param date - The date to format (Date, ISO string, or null)
 * @param fallbackText - Text to display if date is null (default: "Never used")
 * @returns Formatted relative time string
 *
 * @example
 * ```typescript
 * const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
 * formatRelativeTime(twoHoursAgo); // "about 2 hours ago"
 *
 * formatRelativeTime(null); // "Never used"
 * formatRelativeTime(null, "Not yet"); // "Not yet"
 * ```
 */
export function formatRelativeTime(
  date: Date | string | null | undefined,
  fallbackText: string = 'Never used'
): string {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return fallbackText;
  }

  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

/**
 * Format Date
 *
 * Formats a date as a readable date string (e.g., "Jan 15, 2024").
 * Returns fallback text if the date is null/undefined.
 *
 * @param date - The date to format (Date, ISO string, or null)
 * @param formatStr - date-fns format string (default: "MMM d, yyyy")
 * @param fallbackText - Text to display if date is null (default: "-")
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * formatDate('2024-01-15T00:00:00Z'); // "Jan 15, 2024"
 * formatDate('2024-01-15T00:00:00Z', 'yyyy-MM-dd'); // "2024-01-15"
 * formatDate(null); // "-"
 * ```
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatStr: string = 'MMM d, yyyy',
  fallbackText: string = '-'
): string {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return fallbackText;
  }

  return format(parsedDate, formatStr);
}

/**
 * Format Date with Time
 *
 * Formats a date with time (e.g., "Jan 15, 2024 at 10:30 AM").
 * Returns fallback text if the date is null/undefined.
 *
 * @param date - The date to format (Date, ISO string, or null)
 * @param fallbackText - Text to display if date is null (default: "-")
 * @returns Formatted date and time string
 *
 * @example
 * ```typescript
 * formatDateTime('2024-01-15T10:30:00Z'); // "Jan 15, 2024 at 10:30 AM"
 * formatDateTime(null); // "-"
 * ```
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  fallbackText: string = '-'
): string {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return fallbackText;
  }

  return format(parsedDate, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Get Time Until Expiration
 *
 * Returns a human-readable string indicating when a token expires.
 * Returns null if no expiration date or already expired.
 *
 * @param expiresAt - The expiration date
 * @returns String like "Expires in 2 hours" or null
 *
 * @example
 * ```typescript
 * const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);
 * getTimeUntilExpiration(inTwoHours); // "Expires in about 2 hours"
 *
 * getTimeUntilExpiration(null); // null
 * ```
 */
export function getTimeUntilExpiration(
  expiresAt: Date | string | null | undefined
): string | null {
  const parsedDate = parseDate(expiresAt);

  if (!parsedDate) {
    return null;
  }

  if (isPast(parsedDate)) {
    return null;
  }

  return `Expires ${formatDistanceToNow(parsedDate, { addSuffix: true })}`;
}

// =============================================================================
// GROUPING UTILITIES
// =============================================================================

/**
 * Group Connections by Provider
 *
 * Groups an array of connections by their provider.
 *
 * @param connections - Array of connections to group
 * @returns Object with provider IDs as keys and connection arrays as values
 *
 * @example
 * ```typescript
 * const connections = [
 *   { id: '1', provider: 'google', ... },
 *   { id: '2', provider: 'google', ... },
 *   { id: '3', provider: 'microsoft', ... },
 * ];
 *
 * groupConnectionsByProvider(connections);
 * // {
 * //   google: [{ id: '1', ... }, { id: '2', ... }],
 * //   microsoft: [{ id: '3', ... }],
 * // }
 * ```
 */
export function groupConnectionsByProvider(
  connections: ConnectionSummary[]
): Record<string, ConnectionSummary[]> {
  return connections.reduce<Record<string, ConnectionSummary[]>>((groups, connection) => {
    const provider = connection.provider;
    if (!groups[provider]) {
      groups[provider] = [];
    }
    groups[provider].push(connection);
    return groups;
  }, {});
}

/**
 * Get Connection Count for Provider
 *
 * Counts the number of connections for a specific provider.
 *
 * @param connections - Array of all connections
 * @param providerId - The provider ID to count
 * @returns Number of connections for the provider
 */
export function getConnectionCountForProvider(
  connections: ConnectionSummary[],
  providerId: string
): number {
  return connections.filter((c) => c.provider === providerId).length;
}
