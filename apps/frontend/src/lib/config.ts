/**
 * Application configuration
 * Centralized access to environment variables with type safety and fallback values
 */

/**
 * The base URL for the backend API server
 * Falls back to localhost:3013 if not configured
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3013';

/**
 * Configuration object for easy access to all environment variables
 */
export const config = {
  apiUrl: API_URL,
} as const;
