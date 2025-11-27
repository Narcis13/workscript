/**
 * Rename Connection Dialog
 *
 * A dialog component for renaming OAuth connections.
 * Allows users to customize the display name of their connections
 * for easier identification in the UI.
 *
 * @module components/integrations/RenameConnectionDialog
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { ConnectionSummary } from '@/types/integration.types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum allowed length for connection names */
const MAX_NAME_LENGTH = 100;

/** Minimum allowed length for connection names */
const MIN_NAME_LENGTH = 1;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the RenameConnectionDialog component
 */
export interface RenameConnectionDialogProps {
  /** Whether the dialog is open */
  open: boolean;

  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;

  /** The connection to rename (null when dialog is closed) */
  connection: ConnectionSummary | null;

  /** Callback when the user confirms the rename */
  onRename: (id: string, name: string) => void;

  /** Whether the rename operation is in progress */
  loading?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * RenameConnectionDialog Component
 *
 * Renders a dialog for renaming an OAuth connection.
 * Features:
 * - Pre-fills with current name or account email
 * - Validates input (required, min 1 char, max 100 chars)
 * - Shows character counter
 * - Auto-focuses and selects text on open
 * - Shows loading state during rename operation
 *
 * @example
 * ```tsx
 * <RenameConnectionDialog
 *   open={!!selectedConnection}
 *   onOpenChange={(open) => !open && setSelectedConnection(null)}
 *   connection={selectedConnection}
 *   onRename={(id, name) => renameMutation.mutate({ id, name })}
 *   loading={renameMutation.isPending}
 * />
 * ```
 */
export function RenameConnectionDialog({
  open,
  onOpenChange,
  connection,
  onRename,
  loading = false,
}: RenameConnectionDialogProps) {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Get the initial name from connection (name or email fallback)
  const getInitialName = useCallback(() => {
    if (!connection) return '';
    return connection.name || connection.accountEmail || '';
  }, [connection]);

  const [name, setName] = useState(getInitialName);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // DERIVED STATE
  // ---------------------------------------------------------------------------

  const trimmedName = name.trim();
  const characterCount = trimmedName.length;
  const isNameTooShort = characterCount < MIN_NAME_LENGTH;
  const isNameTooLong = characterCount > MAX_NAME_LENGTH;
  const isNameUnchanged = trimmedName === getInitialName();
  const isValid = !isNameTooShort && !isNameTooLong;
  const canSave = isValid && !isNameUnchanged && !loading;

  // Get validation error message
  const getValidationError = (): string | null => {
    if (isNameTooShort && name.length > 0) {
      return 'Name is required';
    }
    if (isNameTooLong) {
      return `Name must be ${MAX_NAME_LENGTH} characters or less`;
    }
    return null;
  };

  const validationError = getValidationError();

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Reset name when connection changes or dialog opens
  useEffect(() => {
    if (open && connection) {
      const initialName = connection.name || connection.accountEmail || '';
      setName(initialName);
    }
  }, [open, connection]);

  // Auto-focus and select text when dialog opens
  useEffect(() => {
    if (open) {
      // Use requestAnimationFrame to ensure the dialog has rendered
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
    }
  }, [open]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleSave = () => {
    if (!connection || !canSave) return;
    onRename(connection.id, trimmedName);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canSave) {
      e.preventDefault();
      handleSave();
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Connection</DialogTitle>
          <DialogDescription>
            Enter a custom name for this connection to help identify it in your
            workflows.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="connection-name">Name</Label>
              <span
                className={`text-xs ${
                  isNameTooLong
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="sr-only">{characterCount} of {MAX_NAME_LENGTH} characters used</span>
                <span aria-hidden="true">{characterCount}/{MAX_NAME_LENGTH}</span>
              </span>
            </div>
            <Input
              ref={inputRef}
              id="connection-name"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter connection name"
              aria-invalid={!!validationError}
              aria-describedby={
                validationError ? 'connection-name-error' : undefined
              }
              disabled={loading}
              maxLength={MAX_NAME_LENGTH + 10} // Allow typing slightly over to show error
            />
            {validationError && (
              <p
                id="connection-name-error"
                className="text-sm text-destructive"
              >
                {validationError}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            aria-label={loading ? "Saving connection name" : "Save connection name"}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                <span aria-live="polite">Saving...</span>
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RenameConnectionDialog;
