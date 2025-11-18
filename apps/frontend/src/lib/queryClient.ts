/**
 * React Query Client Configuration
 *
 * Configures the global QueryClient for TanStack Query with optimized defaults
 * for the Workscript Main UI application.
 *
 * Features:
 * - Automatic retry logic (3 attempts with exponential backoff)
 * - Smart caching (5 minutes stale time, 10 minutes cache time)
 * - Global error handling with toast notifications
 * - Devtools integration for development
 *
 * @module lib/queryClient
 * @see https://tanstack.com/query/latest/docs/react/reference/QueryClient
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Custom error handler for React Query errors
 * Displays user-friendly error messages via toast notifications
 *
 * @param error - The error object from failed query/mutation
 */
const handleError = (error: unknown) => {
  // Extract error message from different error formats
  let errorMessage = 'An unexpected error occurred';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String(error.message);
  }

  // Display error toast
  toast.error('Error', {
    description: errorMessage,
    duration: 5000,
  });
};

/**
 * Global QueryClient instance with configured defaults
 *
 * Default Query Options:
 * - retry: 3 attempts for failed queries (with exponential backoff)
 * - staleTime: 5 minutes (300,000ms) - data stays fresh for 5 minutes
 * - cacheTime: 10 minutes (600,000ms) - unused data removed after 10 minutes
 * - refetchOnWindowFocus: true - refetch when user returns to tab
 * - refetchOnReconnect: true - refetch when network reconnects
 *
 * Default Mutation Options:
 * - Global error handler via toast notifications
 *
 * @example
 * ```tsx
 * import { QueryClientProvider } from '@tanstack/react-query';
 * import { queryClient } from './lib/queryClient';
 *
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <YourApp />
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleError,
  }),
  mutationCache: new MutationCache({
    onError: handleError,
  }),
  defaultOptions: {
    queries: {
      // Retry failed queries up to 3 times with exponential backoff
      retry: 3,

      // How long data stays fresh before being considered stale
      // 5 minutes = 300,000 milliseconds
      staleTime: 5 * 60 * 1000,

      // How long unused data remains in cache before garbage collection
      // 10 minutes = 600,000 milliseconds
      gcTime: 10 * 60 * 1000,

      // Refetch queries when window regains focus (useful for data freshness)
      refetchOnWindowFocus: true,

      // Refetch queries when network reconnects
      refetchOnReconnect: true,

      // Don't refetch on component mount if data is still fresh
      refetchOnMount: false,
    },
    mutations: {
      // Mutations don't need retry by default (can be overridden per mutation)
      retry: 0,
    },
  },
});

/**
 * Type-safe query client for use in TypeScript components
 * Exported as default for convenience
 */
export default queryClient;
