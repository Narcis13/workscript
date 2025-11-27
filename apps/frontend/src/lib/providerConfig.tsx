/**
 * Provider UI Configuration
 *
 * Centralized configuration for OAuth provider UI elements.
 * This file contains metadata, icons, and display settings for all
 * integration providers (available and coming soon).
 *
 * @module providerConfig
 */

/* eslint-disable react-refresh/only-export-components */
// This file exports both icon components and configuration objects.
// This pattern is intentional for centralized provider configuration.

import type { ComponentType, SVGProps } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Provider UI Configuration
 *
 * Defines the UI metadata for an OAuth provider.
 */
export interface ProviderUIConfig {
  /** Provider identifier (matches API provider ID) */
  id: string;

  /** Human-readable provider name */
  name: string;

  /** Brief description of what services can be connected */
  description: string;

  /** SVG icon component for the provider */
  icon: ComponentType<SVGProps<SVGSVGElement>>;

  /** Brand color in hex format (for accent styling) */
  brandColor: string;

  /** Whether this provider is currently available for connection */
  isAvailable: boolean;

  /** Whether this provider is coming soon (shown as placeholder) */
  comingSoon: boolean;
}

// =============================================================================
// PROVIDER ICONS
// =============================================================================

/**
 * Google Icon Component
 *
 * Official Google "G" logo as inline SVG.
 */
export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * Microsoft Icon Component
 *
 * Official Microsoft logo as inline SVG.
 */
export function MicrosoftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#00A4EF" d="M13 1h10v10H13z" />
      <path fill="#7FBA00" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

/**
 * Slack Icon Component
 *
 * Official Slack logo as inline SVG.
 */
export function SlackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#E01E5A"
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
      />
      <path
        fill="#36C5F0"
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
      />
      <path
        fill="#2EB67D"
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
      />
      <path
        fill="#ECB22E"
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
      />
    </svg>
  );
}

/**
 * Notion Icon Component
 *
 * Official Notion logo as inline SVG.
 */
export function NotionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.02c-.42-.326-.98-.7-2.055-.607L3.01 2.72c-.466.046-.56.28-.374.466l1.824 1.022zm.793 3.172v13.851c0 .746.373 1.026 1.213.98l14.523-.84c.84-.046.933-.56.933-1.166V6.354c0-.607-.233-.933-.746-.887l-15.177.887c-.56.046-.746.326-.746.886zm14.337.7c.093.42 0 .84-.42.886l-.7.14v10.264c-.607.327-1.166.514-1.632.514-.746 0-.933-.234-1.493-.933l-4.573-7.186v6.953l1.446.327s0 .84-1.166.84l-3.218.187c-.093-.187 0-.653.327-.746l.84-.234V9.854L7.822 9.62c-.093-.42.14-1.026.793-1.073l3.452-.233 4.76 7.28V9.107l-1.213-.14c-.093-.513.28-.886.746-.933l3.218-.186zm-16.897-6.56L16.24.933c1.446-.093 1.82-.046 2.707.607l4.012 2.893c.84.607 1.12 1.213 1.12 2.24v14.636c0 1.586-.56 2.52-2.52 2.66l-15.55.92c-1.493.093-2.193-.14-2.893-.98l-1.773-2.287c-.28-.374-.607-.98-.607-1.493V4.453c0-1.306.56-2.426 2.053-2.633z" />
    </svg>
  );
}

/**
 * Default Icon Component
 *
 * Generic plug icon for unknown providers.
 */
export function DefaultProviderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

// =============================================================================
// PROVIDER CONFIGURATIONS
// =============================================================================

/**
 * Google Provider Configuration
 *
 * Available for Gmail, Google Calendar, Google Drive connections.
 */
const googleConfig: ProviderUIConfig = {
  id: 'google',
  name: 'Google',
  description: 'Connect Gmail, Google Calendar, Drive and other Google services',
  icon: GoogleIcon,
  brandColor: '#4285F4',
  isAvailable: true,
  comingSoon: false,
};

/**
 * Microsoft Provider Configuration
 *
 * Coming soon - will support Outlook, OneDrive, Teams.
 */
const microsoftConfig: ProviderUIConfig = {
  id: 'microsoft',
  name: 'Microsoft',
  description: 'Connect Outlook, OneDrive, Teams and Microsoft 365 services',
  icon: MicrosoftIcon,
  brandColor: '#00A4EF',
  isAvailable: false,
  comingSoon: true,
};

/**
 * Slack Provider Configuration
 *
 * Coming soon - will support Slack workspaces.
 */
const slackConfig: ProviderUIConfig = {
  id: 'slack',
  name: 'Slack',
  description: 'Connect Slack workspaces for messaging and notifications',
  icon: SlackIcon,
  brandColor: '#4A154B',
  isAvailable: false,
  comingSoon: true,
};

/**
 * Notion Provider Configuration
 *
 * Coming soon - will support Notion workspaces and databases.
 */
const notionConfig: ProviderUIConfig = {
  id: 'notion',
  name: 'Notion',
  description: 'Connect Notion workspaces, databases and pages',
  icon: NotionIcon,
  brandColor: '#000000',
  isAvailable: false,
  comingSoon: true,
};

/**
 * Default Provider Configuration
 *
 * Used for unknown provider IDs.
 */
const defaultConfig: ProviderUIConfig = {
  id: 'unknown',
  name: 'Unknown Provider',
  description: 'Connect to this service',
  icon: DefaultProviderIcon,
  brandColor: '#6B7280',
  isAvailable: false,
  comingSoon: false,
};

// =============================================================================
// PROVIDER REGISTRY
// =============================================================================

/**
 * Provider Configuration Map
 *
 * Maps provider IDs to their UI configurations.
 * Add new providers here to make them available in the UI.
 */
export const providerConfigs: Record<string, ProviderUIConfig> = {
  google: googleConfig,
  microsoft: microsoftConfig,
  slack: slackConfig,
  notion: notionConfig,
};

/**
 * All Provider Configurations
 *
 * Array of all provider configs for iteration.
 * Ordered: available providers first, then coming soon.
 */
export const allProviderConfigs: ProviderUIConfig[] = [
  googleConfig,
  microsoftConfig,
  slackConfig,
  notionConfig,
];

/**
 * Available Provider Configurations
 *
 * Only providers that are currently available for connection.
 */
export const availableProviderConfigs: ProviderUIConfig[] =
  allProviderConfigs.filter((p) => p.isAvailable);

/**
 * Coming Soon Provider Configurations
 *
 * Providers that are shown as coming soon placeholders.
 */
export const comingSoonProviderConfigs: ProviderUIConfig[] =
  allProviderConfigs.filter((p) => p.comingSoon);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Provider Configuration
 *
 * Returns the UI configuration for a provider by ID.
 * Returns a default configuration if the provider is unknown.
 *
 * @param providerId - The provider identifier (e.g., 'google', 'microsoft')
 * @returns The provider's UI configuration
 *
 * @example
 * ```typescript
 * const googleConfig = getProviderConfig('google');
 * // { id: 'google', name: 'Google', ... }
 *
 * const unknownConfig = getProviderConfig('unknown-provider');
 * // { id: 'unknown', name: 'Unknown Provider', ... }
 * ```
 */
export function getProviderConfig(providerId: string): ProviderUIConfig {
  return providerConfigs[providerId] || { ...defaultConfig, id: providerId };
}

/**
 * Check if Provider is Available
 *
 * Quick check if a provider is currently available for connection.
 *
 * @param providerId - The provider identifier
 * @returns Whether the provider is available
 */
export function isProviderAvailable(providerId: string): boolean {
  const config = providerConfigs[providerId];
  return config?.isAvailable ?? false;
}

/**
 * Get Provider Icon
 *
 * Returns just the icon component for a provider.
 * Useful when only the icon is needed.
 *
 * @param providerId - The provider identifier
 * @returns The icon component
 */
export function getProviderIcon(
  providerId: string
): ComponentType<SVGProps<SVGSVGElement>> {
  const config = getProviderConfig(providerId);
  return config.icon;
}

/**
 * Get Provider Brand Color
 *
 * Returns the brand color for a provider.
 *
 * @param providerId - The provider identifier
 * @returns The hex color string
 */
export function getProviderBrandColor(providerId: string): string {
  const config = getProviderConfig(providerId);
  return config.brandColor;
}
