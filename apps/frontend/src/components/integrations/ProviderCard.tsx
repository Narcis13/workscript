/**
 * ProviderCard Component
 *
 * Displays an OAuth provider's information in a card format.
 * Shows the provider icon, name, description, and a Connect button.
 * Supports both available providers and "Coming Soon" placeholders.
 *
 * Features:
 * - Provider branded icon and colors
 * - Connection count badge when connections exist
 * - Coming Soon badge and disabled state for unavailable providers
 * - Loading state on Connect button during OAuth flow
 * - Hover and focus states for accessibility
 * - Tooltip for coming soon providers
 *
 * Requirements Coverage:
 * - Requirement 2: Available Providers Display
 * - Requirement 3: Provider Card Component
 * - Requirement 21: Accessibility
 *
 * @module components/integrations/ProviderCard
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Plus } from 'lucide-react';
import { getProviderConfig, type ProviderUIConfig } from '@/lib/providerConfig';
import type { ProviderMetadata } from '@/types/integration.types';
import { cn } from '@/lib/utils';

/**
 * Props for the ProviderCard component
 */
export interface ProviderCardProps {
  /**
   * Provider metadata from API (optional - can use just providerId for coming soon)
   */
  provider?: ProviderMetadata;

  /**
   * Provider ID (used to get UI config when provider metadata is not available)
   */
  providerId?: string;

  /**
   * Number of active connections for this provider
   */
  connectionCount?: number;

  /**
   * Callback when the Connect button is clicked
   */
  onConnect?: (providerId: string) => void;

  /**
   * Whether the OAuth connection is in progress
   */
  connecting?: boolean;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * ProviderCard Component
 *
 * Displays a single OAuth provider's information with a Connect button.
 * Supports both API-returned providers and hardcoded coming soon providers.
 *
 * @example
 * ```tsx
 * // Available provider from API
 * <ProviderCard
 *   provider={googleProvider}
 *   connectionCount={2}
 *   onConnect={(id) => handleConnect(id)}
 *   connecting={false}
 * />
 *
 * // Coming soon provider (no API data)
 * <ProviderCard
 *   providerId="microsoft"
 *   onConnect={() => {}}
 * />
 * ```
 */
export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  providerId,
  connectionCount = 0,
  onConnect,
  connecting = false,
  className,
}) => {
  // Get the provider ID from either the provider object or the prop
  const id = provider?.id || providerId;

  if (!id) {
    console.warn('ProviderCard: No provider ID provided');
    return null;
  }

  // Get UI configuration for this provider
  const config: ProviderUIConfig = getProviderConfig(id);
  const Icon = config.icon;

  // Determine if this provider is available or coming soon
  const isComingSoon = config.comingSoon;
  const isAvailable = config.isAvailable;

  /**
   * Handle Connect button click
   */
  const handleConnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConnect && isAvailable && !connecting) {
      onConnect(id);
    }
  };

  /**
   * Card content to be wrapped with or without tooltip
   */
  const cardContent = (
    <Card
      className={cn(
        'transition-all duration-200',
        isAvailable && 'hover:shadow-lg hover:border-primary/50',
        isComingSoon && 'opacity-60 cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      tabIndex={isAvailable ? 0 : -1}
      aria-label={`${config.name} provider${isComingSoon ? ' - Coming Soon' : ''}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          {/* Provider Icon */}
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: isComingSoon
                ? undefined
                : `${config.brandColor}10`,
            }}
          >
            <Icon
              className={cn('h-6 w-6', isComingSoon && 'opacity-50')}
              aria-hidden="true"
            />
          </div>

          {/* Badges */}
          <div className="flex gap-2">
            {isComingSoon ? (
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                Coming Soon
              </Badge>
            ) : connectionCount > 0 ? (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                {connectionCount} connected
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Provider Name */}
        <CardTitle
          className={cn(
            'text-lg mt-3',
            isComingSoon && 'text-muted-foreground'
          )}
        >
          {config.name}
        </CardTitle>

        {/* Provider Description */}
        <CardDescription className={cn('line-clamp-2', isComingSoon && 'opacity-75')}>
          {config.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-0">
        {/* Empty content area - keeps card height consistent */}
      </CardContent>

      <CardFooter>
        <Button
          variant={isComingSoon ? 'outline' : 'default'}
          className="w-full"
          onClick={handleConnect}
          disabled={!isAvailable || connecting}
          aria-label={
            isComingSoon
              ? `${config.name} coming soon`
              : `Connect ${config.name} account`
          }
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span aria-live="polite">Connecting...</span>
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {isComingSoon ? 'Coming Soon' : `Connect ${config.name}`}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );

  // Wrap coming soon providers with tooltip
  if (isComingSoon) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full">{cardContent}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.name} integration will be available soon</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
};

export default ProviderCard;
