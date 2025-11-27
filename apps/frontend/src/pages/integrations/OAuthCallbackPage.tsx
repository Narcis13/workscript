/**
 * OAuthCallbackPage - OAuth Flow Callback Handler
 *
 * Minimal page displayed after OAuth authentication flow completes.
 * Opens in a new tab from the Integrations page and shows success/error status.
 *
 * Features:
 * - Parses success/error parameters from URL
 * - Displays success state with checkmark and account info
 * - Displays error state with retry option
 * - Handles invalid callback state
 * - Minimal layout (no sidebar) with dark mode support
 *
 * Requirements Coverage:
 * - Requirement 5: OAuth Callback Page
 *
 * @module pages/integrations/OAuthCallbackPage
 */

import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getProviderConfig } from '@/lib/providerConfig';
import { getOAuthAuthUrl } from '@/services/api/integrations.api';

// =============================================================================
// TYPES
// =============================================================================

type CallbackState = 'success' | 'error' | 'invalid';

interface ParsedCallbackParams {
  state: CallbackState;
  provider: string | null;
  email: string | null;
  connectionId: string | null;
  errorMessage: string | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse URL search parameters to determine callback state
 */
function parseCallbackParams(searchParams: URLSearchParams): ParsedCallbackParams {
  const success = searchParams.get('success');
  const error = searchParams.get('error');
  const provider = searchParams.get('provider');
  const email = searchParams.get('email');
  const connectionId = searchParams.get('connectionId') || searchParams.get('connection_id');
  const errorMessage = searchParams.get('message') || searchParams.get('error_message');

  // Determine callback state
  if (success === 'true') {
    return {
      state: 'success',
      provider,
      email,
      connectionId,
      errorMessage: null,
    };
  }

  if (error || success === 'false') {
    return {
      state: 'error',
      provider,
      email: null,
      connectionId: null,
      errorMessage: errorMessage || error || 'Authentication failed',
    };
  }

  // Neither success nor error - invalid callback
  return {
    state: 'invalid',
    provider,
    email: null,
    connectionId: null,
    errorMessage: null,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * OAuthCallbackPage Component
 *
 * Displays the result of an OAuth authentication flow.
 * This page is opened in a new tab after the OAuth provider redirects back.
 */
export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parse URL parameters
  const params = useMemo(
    () => parseCallbackParams(searchParams),
    [searchParams]
  );

  // Get provider config if provider is known
  const providerConfig = useMemo(
    () => (params.provider ? getProviderConfig(params.provider) : null),
    [params.provider]
  );

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  /**
   * Handle retry - re-initiate OAuth flow or go to integrations page
   */
  const handleRetry = () => {
    if (params.provider) {
      // Re-initiate OAuth flow for the same provider
      const callbackUrl = `${window.location.origin}/integrations/oauth/callback`;
      const authUrl = getOAuthAuthUrl(params.provider, {
        redirect: callbackUrl,
      });
      window.location.href = authUrl;
    } else {
      // Go back to integrations page
      navigate('/integrations');
    }
  };

  /**
   * Handle go to integrations page
   */
  const handleGoToIntegrations = () => {
    // Open in same tab (replacing this callback page)
    navigate('/integrations');
  };

  // ===========================================================================
  // RENDER - SUCCESS STATE
  // ===========================================================================

  if (params.state === 'success') {
    const ProviderIcon = providerConfig?.icon;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" role="main" aria-labelledby="success-heading">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center" aria-hidden="true">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2" role="alert" aria-live="polite">
            <h1 id="success-heading" className="text-2xl font-bold text-foreground">
              Connection Successful!
            </h1>
            {providerConfig && (
              <p className="text-lg text-muted-foreground">
                Your {providerConfig.name} account has been connected.
              </p>
            )}
          </div>

          {/* Account Info */}
          {params.email && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-center gap-3">
                {ProviderIcon && (
                  <ProviderIcon className="h-6 w-6" aria-hidden="true" />
                )}
                <span className="font-medium text-foreground">{params.email}</span>
              </div>
            </div>
          )}

          {/* Close Tab Instruction */}
          <p className="text-sm text-muted-foreground">
            You can now close this tab and return to your application.
          </p>

          {/* Secondary Action - Go to Integrations */}
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={handleGoToIntegrations}
              className="inline-flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Go to Integrations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // RENDER - ERROR STATE
  // ===========================================================================

  if (params.state === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" role="main" aria-labelledby="error-heading">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Error Icon */}
          <div className="flex justify-center" aria-hidden="true">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
              <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-2" role="alert" aria-live="assertive">
            <h1 id="error-heading" className="text-2xl font-bold text-foreground">
              Connection Failed
            </h1>
            <p className="text-muted-foreground">
              {params.errorMessage || 'An error occurred during authentication.'}
            </p>
          </div>

          {/* Provider Info */}
          {providerConfig && (
            <p className="text-sm text-muted-foreground">
              Failed to connect to {providerConfig.name}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              variant="outline"
              onClick={handleGoToIntegrations}
              className="inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Integrations
            </Button>
            <Button
              onClick={handleRetry}
              className="inline-flex items-center gap-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // RENDER - INVALID CALLBACK STATE
  // ===========================================================================

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" role="main" aria-labelledby="invalid-heading">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Warning Icon */}
        <div className="flex justify-center" aria-hidden="true">
          <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-4">
            <AlertTriangle className="h-16 w-16 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        {/* Invalid Callback Message */}
        <div className="space-y-2" role="alert">
          <h1 id="invalid-heading" className="text-2xl font-bold text-foreground">
            Invalid Callback
          </h1>
          <p className="text-muted-foreground">
            This page was accessed without valid authentication parameters.
          </p>
        </div>

        {/* Help Text */}
        <p className="text-sm text-muted-foreground">
          Please start the connection process from the Integrations page.
        </p>

        {/* Navigation Button */}
        <div className="pt-2">
          <Button
            onClick={handleGoToIntegrations}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Integrations
          </Button>
        </div>
      </div>
    </div>
  );
}
