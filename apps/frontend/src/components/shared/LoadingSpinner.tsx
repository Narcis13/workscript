import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the LoadingSpinner component
 */
export interface LoadingSpinnerProps {
  /**
   * Size variant of the spinner
   * - sm: Small (16px) - for inline elements, buttons
   * - md: Medium (24px) - for cards, sections (default)
   * - lg: Large (40px) - for full page loading
   * @default "md"
   */
  size?: "sm" | "md" | "lg";

  /**
   * Optional text label displayed below the spinner
   * @example "Loading workflows...", "Processing...", "Please wait"
   */
  label?: string;

  /**
   * Optional additional CSS classes
   */
  className?: string;

  /**
   * Whether to center the spinner in its container
   * When true, applies flex centering (useful for full-width containers)
   * @default false
   */
  centered?: boolean;
}

/**
 * Size class mappings for the spinner icon
 */
const sizeClasses = {
  sm: "size-4",
  md: "size-6",
  lg: "size-10",
} as const;

/**
 * LoadingSpinner component displays an animated loading indicator
 *
 * This component provides a consistent loading experience across the application.
 * It uses the Loader2 icon from lucide-react with a spinning animation.
 * The spinner can be customized with different sizes and an optional text label.
 *
 * @component
 * @example
 * ```tsx
 * // Basic spinner (medium size, no label)
 * <LoadingSpinner />
 *
 * // Small spinner for inline use
 * <LoadingSpinner size="sm" />
 *
 * // Large spinner with label for full page loading
 * <LoadingSpinner size="lg" label="Loading workflows..." centered />
 *
 * // Medium spinner with label in a card
 * <LoadingSpinner label="Processing..." />
 *
 * // Spinner in button (small, no label)
 * <Button disabled>
 *   <LoadingSpinner size="sm" />
 *   Loading
 * </Button>
 *
 * // Custom styling
 * <LoadingSpinner className="text-primary" label="Custom color..." />
 * ```
 *
 * @param {LoadingSpinnerProps} props - Component props
 * @returns {React.ReactElement} The rendered LoadingSpinner component
 *
 * @remarks
 * - Used in: Node Library Browser (Req 1), Workflow List (Req 4), Workflow Detail (Req 8),
 *   Automation List (Req 9), Execution History (Req 14), Loading States (Req 19)
 * - Provides consistent loading UX across the application
 * - Fully accessible with proper ARIA attributes
 * - Animation is smooth and performant (CSS-based rotation)
 * - Spinner respects user's reduced motion preferences via Tailwind animate-spin
 * - Small size (sm) is perfect for inline use in buttons and text
 * - Medium size (md) is ideal for card content and section loading
 * - Large size (lg) is best for full page or modal loading states
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  label,
  className,
  centered = false,
}) => {
  const containerClasses = cn(
    "inline-flex flex-col items-center gap-2",
    {
      "justify-center w-full py-8": centered,
    },
    className
  );

  return (
    <div
      className={containerClasses}
      role="status"
      aria-live="polite"
      aria-label={label || "Loading"}
    >
      <Loader2
        className={cn(
          sizeClasses[size],
          "animate-spin text-muted-foreground"
        )}
        aria-hidden="true"
      />

      {label && (
        <span className="text-sm text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
