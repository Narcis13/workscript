import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useAIUsage, useSyncAIModels, useAIModelCount } from '@/hooks/api/useAI';
import { RefreshCw, DollarSign, Cpu, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props for the AIManagement component
 */
export interface AIManagementProps {
  /**
   * Optional additional CSS classes
   */
  className?: string;
}

/**
 * Format a number as USD currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

/**
 * Format large numbers with commas
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * AIManagement Dashboard Widget
 *
 * Provides administrators with:
 * - Total AI usage cost display
 * - Model sync functionality (OpenRouter integration)
 * - Usage statistics overview
 *
 * This widget allows admins to:
 * 1. Monitor AI spending and usage costs
 * 2. Manually trigger AI model synchronization from OpenRouter
 *
 * @component
 * @example
 * ```tsx
 * <AIManagement />
 * ```
 */
export const AIManagement: React.FC<AIManagementProps> = ({ className }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Fetch AI usage statistics
  const {
    data: usage,
    isLoading: usageLoading,
    error: usageError,
    refetch: refetchUsage,
  } = useAIUsage();

  // Fetch model count
  const { data: modelCount, isLoading: modelCountLoading } = useAIModelCount();

  // Model sync mutation
  const syncMutation = useSyncAIModels();

  const handleSyncModels = () => {
    syncMutation.mutate();
  };

  // Calculate top model by cost
  const topModelByCost = React.useMemo<[string, { requests: number; tokens: number; cost: number }] | null>(() => {
    if (!usage?.byModel) return null;
    const entries = Object.entries(usage.byModel);
    if (entries.length === 0) return null;
    return entries.reduce((max, curr) =>
      curr[1].cost > max[1].cost ? curr : max
    );
  }, [usage?.byModel]);

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          AI Management
        </CardTitle>
        <CardDescription>
          OpenRouter integration and cost tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error State */}
        {usageError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load AI usage data.{' '}
              <button
                onClick={() => refetchUsage()}
                className="underline hover:no-underline"
              >
                Retry
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Cost Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total AI Cost
                </p>
                {usageLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <p className="text-2xl font-bold">
                    {usage ? formatCurrency(usage.totalCost) : '$0.00'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Usage Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium text-muted-foreground">
                Total Requests
              </p>
              {usageLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <p className="text-lg font-semibold">
                  {usage ? formatNumber(usage.totalRequests) : '0'}
                </p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium text-muted-foreground">
                Total Tokens
              </p>
              {usageLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <p className="text-lg font-semibold">
                  {usage ? formatNumber(usage.totalTokens) : '0'}
                </p>
              )}
            </div>
          </div>

          {/* Top Model by Cost */}
          {topModelByCost && (
            <div className="p-3 rounded-lg bg-muted/50 border border-muted">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Highest Cost Model
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate max-w-[60%]">
                  {topModelByCost[0]}
                </p>
                <p className="text-sm font-semibold text-primary">
                  {formatCurrency(topModelByCost[1].cost)}
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Model Sync Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Available Models</span>
            </div>
            {modelCountLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <span className="text-sm text-muted-foreground">
                {modelCount ?? 0} models
              </span>
            )}
          </div>

          {/* Sync Button - Admin Only */}
          {isAdmin ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSyncModels}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Syncing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-4 mr-2" />
                  Sync Models from OpenRouter
                </>
              )}
            </Button>
          ) : (
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">
                Admin access required to sync models
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Models are automatically synced daily at 3:00 AM UTC
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIManagement;
