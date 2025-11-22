/**
 * useToast Hook - Wrapper around sonner for toast notifications
 *
 * Provides a simple API for showing toast notifications throughout the app.
 * Uses sonner library for rendering toasts.
 *
 * @module hooks/use-toast
 */

import { toast as sonnerToast } from 'sonner';

export interface ToastOptions {
  /**
   * Toast title (main message)
   */
  title?: string;

  /**
   * Toast description (secondary message)
   */
  description?: string;

  /**
   * Toast variant/type
   */
  variant?: 'default' | 'destructive' | 'success';

  /**
   * Duration in milliseconds (default: 4000)
   */
  duration?: number;
}

/**
 * Custom hook for displaying toast notifications
 *
 * Example usage:
 * ```tsx
 * const { toast } = useToast();
 *
 * toast({
 *   title: "Success!",
 *   description: "Your changes have been saved.",
 *   variant: "success"
 * });
 * ```
 */
export function useToast() {
  const toast = ({ title, description, variant = 'default', duration }: ToastOptions) => {
    const message = description ? `${title}\n${description}` : title || '';

    switch (variant) {
      case 'destructive':
        return sonnerToast.error(title, {
          description,
          duration: duration || 4000,
        });
      case 'success':
        return sonnerToast.success(title, {
          description,
          duration: duration || 4000,
        });
      default:
        return sonnerToast(title, {
          description,
          duration: duration || 4000,
        });
    }
  };

  return { toast };
}
