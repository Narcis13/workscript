/**
 * Disconnect Confirmation Dialog
 *
 * A confirmation dialog for disconnecting OAuth connections.
 * Warns users about the impact of disconnecting on their workflows
 * before allowing them to proceed with the action.
 *
 * @module components/integrations/DisconnectConfirmDialog
 */

import { Loader2, AlertTriangle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { ConnectionSummary } from '@/types/integration.types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the DisconnectConfirmDialog component
 */
export interface DisconnectConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;

  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;

  /** The connection to disconnect (null when dialog is closed) */
  connection: ConnectionSummary | null;

  /** Callback when the user confirms the disconnect */
  onConfirm: () => void;

  /** Whether the disconnect operation is in progress */
  loading?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * DisconnectConfirmDialog Component
 *
 * Renders an alert dialog for confirming the disconnection of an OAuth connection.
 * Features:
 * - Displays warning icon to indicate destructive action
 * - Shows the connection name or email being disconnected
 * - Warns about impact on workflows using this connection
 * - Provides Cancel and Disconnect buttons
 * - Shows loading state during disconnect operation
 *
 * @example
 * ```tsx
 * <DisconnectConfirmDialog
 *   open={!!connectionToDelete}
 *   onOpenChange={(open) => !open && setConnectionToDelete(null)}
 *   connection={connectionToDelete}
 *   onConfirm={() => deleteMutation.mutate(connectionToDelete.id)}
 *   loading={deleteMutation.isPending}
 * />
 * ```
 */
export function DisconnectConfirmDialog({
  open,
  onOpenChange,
  connection,
  onConfirm,
  loading = false,
}: DisconnectConfirmDialogProps) {
  // ---------------------------------------------------------------------------
  // DERIVED STATE
  // ---------------------------------------------------------------------------

  // Get display name for the connection (name or email fallback)
  const connectionDisplayName = connection?.name || connection?.accountEmail || 'this connection';

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleConfirm = () => {
    if (loading) return;
    onConfirm();
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            </div>
            <AlertDialogTitle>Disconnect Account?</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-2 pt-2">
              <p>
                You are about to disconnect{' '}
                <span className="font-medium text-foreground">{connectionDisplayName}</span>.
              </p>
              <p className="text-destructive/90">
                Workflows using this connection will no longer work until you reconnect.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(buttonVariants({ variant: 'destructive' }))}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Disconnecting...
              </>
            ) : (
              'Disconnect'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DisconnectConfirmDialog;
