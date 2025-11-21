import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * CopyButton Component
 *
 * A reusable button component that copies text to clipboard with visual feedback.
 * Shows a copy icon that changes to a checkmark when clicked, and displays a toast notification.
 *
 * @example
 * ```tsx
 * // Copy execution ID
 * <CopyButton value="exec-123-abc" label="Execution ID" />
 *
 * // Copy with custom text
 * <CopyButton value="workflow-data" label="Copy workflow" text="Workflow ID" />
 *
 * // Copy code snippet
 * <CopyButton value={jsonString} size="sm" variant="ghost" />
 * ```
 */

export interface CopyButtonProps {
  /**
   * The text content to copy to clipboard
   */
  value: string;

  /**
   * Human-readable label for the toast notification (e.g., "Execution ID", "Webhook URL")
   * Defaults to "Text"
   */
  label?: string;

  /**
   * Display text for the button (e.g., "Copy ID", "Copy Code")
   * If not provided, only the icon is shown
   */
  text?: string;

  /**
   * Button size variant from shadcn/ui
   * @default "sm"
   */
  size?: "sm" | "md" | "lg" | "default";

  /**
   * Button style variant from shadcn/ui
   * @default "outline"
   */
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";

  /**
   * Additional CSS classes to apply to the button
   */
  className?: string;

  /**
   * Optional callback when copy is successful
   */
  onCopy?: () => void;
}

/**
 * CopyButton Component
 *
 * Displays a button that copies the provided text to clipboard.
 * Shows visual feedback with icon change and toast notification.
 * Automatically reverts to copy icon after 2 seconds.
 *
 * @param {CopyButtonProps} props - Component properties
 * @returns {JSX.Element} The rendered copy button
 */
export function CopyButton({
  value,
  label = "Text",
  text,
  size = "sm",
  variant = "outline",
  className,
  onCopy,
}: CopyButtonProps): JSX.Element {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      toast.success(`Copied to clipboard`);

      // Call optional callback
      onCopy?.();

      // Reset icon after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Button
      onClick={handleCopy}
      size={size}
      variant={variant}
      className={cn(
        "transition-all duration-200",
        isCopied && "text-green-600 dark:text-green-400",
        className
      )}
      title={`Copy ${label}`}
    >
      {isCopied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {text && <span className="ml-2">{text}</span>}
    </Button>
  );
}

export default CopyButton;
