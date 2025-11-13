/**
 * Base Axios instance for API communication
 *
 * This file configures the axios client with:
 * - Base URL from environment variables
 * - Credentials support for cookies
 * - Default headers
 *
 * Note: Request/response interceptors for authentication are added in AuthService
 * to avoid circular dependencies and keep concerns separated.
 *
 * @see src/services/AuthService.ts for token management interceptors
 */

import axios from 'axios';
import { config } from './config';

/**
 * Base axios instance configured for API communication
 *
 * Configuration:
 * - baseURL: API server URL from environment (default: http://localhost:3013)
 * - withCredentials: true (allows cookies to be sent with requests)
 * - headers: JSON content type
 *
 * Usage:
 * ```typescript
 * import { apiClient } from './lib/api';
 *
 * // Make a GET request
 * const response = await apiClient.get('/api/users');
 *
 * // Make a POST request
 * const response = await apiClient.post('/api/login', { email, password });
 * ```
 */
export const apiClient = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true, // Allow cookies to be sent with requests (for CSRF tokens, etc.)
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Export a default instance for convenience
 */
export default apiClient;
