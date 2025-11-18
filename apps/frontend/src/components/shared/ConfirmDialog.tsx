import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon } from "lucide-react";

/**
 * Props for the ConfirmDialog component
 */
export interface ConfirmDialogProps {
  /**
   * Controls whether the dialog is open or closed
   */
  open: boolean;

  /**
   * Callback fired when the dialog should close (e.g., cancel, close X, overlay click)
   */
  onOpenChange: (open: boolean) => void;

  /**
   * The title/heading of the confirmation dialog
   * @example "Delete Workflow?"
   * @example "Are you sure?"
   */
  title: string;

  /**
   * The detailed description explaining what will happen if confirmed
   * @example "Are you sure you want to delete 'My Workflow'? This action cannot be undone."
   */
  description: string;

  /**
   * Label for the confirm button
   * @default "Confirm"
   * @example "Delete"
   * @example "Yes, delete"
   * @example "Continue"
   */
  confirmLabel?: string;

  /**
   * Label for the cancel button
   * @default "Cancel"
   */
  cancelLabel?: string;

  /**
   * Callback fired when the user confirms the action
   */
  onConfirm: () => void;

  /**
   * Callback fired when the user cancels the action (optional, defaults to closing dialog)
   */
  onCancel?: () => void;

  /**
   * Whether this is a destructive action (shows red confirm button with warning icon)
   * @default false
   */
  isDestructive?: boolean;

  /**
   * Whether the confirm action is currently loading
   * @default false
   */
  loading?: boolean;

  /**
   * Whether to disable the confirm button
   * @default false
   */
  disabled?: boolean;
}

/**
 * ConfirmDialog component provides a reusable confirmation dialog for user actions
 *
 * This component is used throughout the application to confirm destructive or important
 * actions before they are executed. It uses the shadcn/ui Dialog component and provides
 * consistent styling and behavior for confirmation flows.
 *
 * The dialog supports both destructive actions (with red styling and warning icon) and
 * regular confirmations (with default primary button styling).
 *
 * @component
 * @example
 * ```tsx
 * // Basic confirmation dialog
 * const [open, setOpen] = useState(false);
 *
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Confirm Action"
 *   description="Are you sure you want to proceed?"
 *   onConfirm={() => {
 *     console.log('Confirmed!');
 *     setOpen(false);
 *   }}
 * />
 *
 * // Destructive action (delete workflow)
 * <ConfirmDialog
 *   open={deleteDialogOpen}
 *   onOpenChange={setDeleteDialogOpen}
 *   title="Delete Workflow?"
 *   description="Are you sure you want to delete 'Email Campaign Workflow'? This action cannot be undone."
 *   confirmLabel="Delete"
 *   isDestructive
 *   onConfirm={async () => {
 *     await deleteWorkflow(workflowId);
 *     setDeleteDialogOpen(false);
 *   }}
 * />
 *
 * // With loading state
 * const [isDeleting, setIsDeleting] = useState(false);
 *
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete Automation?"
 *   description="This will unschedule the automation permanently."
 *   confirmLabel="Yes, delete"
 *   isDestructive
 *   loading={isDeleting}
 *   onConfirm={async () => {
 *     setIsDeleting(true);
 *     try {
 *       await deleteAutomation(id);
 *       setOpen(false);
 *     } finally {
 *       setIsDeleting(false);
 *     }
 *   }}
 * />
 *
 * // With custom cancel handler
 * <ConfirmDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Unsaved Changes"
 *   description="You have unsaved changes. Are you sure you want to leave?"
 *   confirmLabel="Leave"
 *   cancelLabel="Stay"
 *   onConfirm={() => navigate(-1)}
 *   onCancel={() => {
 *     console.log('User chose to stay');
 *     setOpen(false);
 *   }}
 * />
 * ```
 *
 * @param {ConfirmDialogProps} props - Component props
 * @returns {React.ReactElement} The rendered ConfirmDialog component
 *
 * @remarks
 * - Used in: Workflow deletion (Req 4), Workflow editing unsaved changes (Req 6),
 *   Automation deletion (Req 9), Automation creation cancel (Req 10),
 *   Automation detail actions (Req 12)
 * - Provides consistent UX for confirmation dialogs across the application
 * - Supports both destructive (red button) and non-destructive confirmations
 * - Handles loading states during async operations
 * - Fully accessible with proper ARIA labels and keyboard navigation
 * - Dialog can be closed via: cancel button, X button, escape key, or overlay click
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = false,
  loading = false,
  disabled = false,
}) => {
  /**
   * Handle cancel action
   * Calls custom onCancel handler if provided, otherwise just closes the dialog
   */
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  /**
   * Handle confirm action
   * Calls the onConfirm handler (which may be async)
   */
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDestructive && (
              <AlertTriangleIcon
                className="size-5 text-destructive"
                aria-hidden="true"
              />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            type="button"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={disabled || loading}
            type="button"
          >
            {loading ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
